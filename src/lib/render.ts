import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import Handlebars from "handlebars";
import { indexIds, loadFeature, resolveFeature } from "./model.js";
import { featureDir, featureFile, renderedDir, stateDir, templatesDir, type Location } from "./paths.js";
import { enumLabel, phaseIndex, phaseInfo, phaseProducing, phases } from "./schema.js";
import type { Feature, RenderedFile, RenderResult, ValidationResult } from "./types.js";
import { validate } from "./validate.js";

interface FileSpec {
  path: string;
  source: string;
  template: string;
  section: string | null;
  title: string;
}

export const FILE_SPECS: readonly FileSpec[] = [
  { path: "index.md", source: "", template: "index.hbs", section: null, title: "Overview" },
  { path: "framing.md", source: "/framing", template: "framing.hbs", section: "framing", title: "" },
  { path: "requirements.md", source: "/requirements", template: "requirements.hbs", section: "requirements", title: "" },
  { path: "criteria.md", source: "/criteria", template: "criteria.hbs", section: "criteria", title: "" },
  { path: "anchors.md", source: "/anchors", template: "anchors.hbs", section: "anchors", title: "" },
  { path: "verification.md", source: "/tests", template: "tests.hbs", section: "tests", title: "" },
  { path: "decisions.md", source: "/decisions", template: "decisions.hbs", section: "decisions", title: "Decisions" },
];

const LABELS: Record<string, Record<string, string>> = {
  pattern: { ubiquitous: "ubiquitous", event: "event-driven", state: "state-driven", unwanted: "unwanted behaviour", optional: "optional feature", complex: "complex" },
  decisionStatus: { proposed: "proposed", accepted: "accepted", superseded: "superseded" },
  artifactKind: { context: "context", flow: "flow", sequence: "sequence", state: "states", screen: "screen", module: "modules" },
  by: { agent: "the agent", owner: "the owner" },
};
export function headingSlug(heading: string): string {
  return encodeURI(
    heading
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[\][!/'"#$%&()*+,./:;<=>?@\\^{|}~`。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝]/g, "")
      .replace(/^-+/, "")
      .replace(/-+$/, ""),
  );
}

const label = (table: string, value: unknown) => LABELS[table]![String(value)] ?? "to specify";
export const phaseTitle = (name: string | null | undefined) => phaseInfo(name)?.title ?? "inconnue";

const handlebars = Handlebars.create();
handlebars.registerPartial("artifact", readFileSync(join(templatesDir, "artifact.hbs"), "utf8"));
const compiled = new Map<string, Handlebars.TemplateDelegate>();
function template(name: string): Handlebars.TemplateDelegate {
  let fn = compiled.get(name);
  if (!fn) {
    fn = handlebars.compile(readFileSync(join(templatesDir, name), "utf8"), { noEscape: true, strict: false });
    compiled.set(name, fn);
  }
  return fn;
}

type Rec = Record<string, unknown>;
const list = (value: unknown): Rec[] => (Array.isArray(value) ? (value as Rec[]) : []);
const joined = (value: unknown): string => (Array.isArray(value) ? value.map(String).join(", ") : "");

const ID_REF = /^(FEAT-\d{3}\/)?[A-Z]+-\d+(\.\d+)?$/;

function sources(req: Rec): { sourceList: string; footnotes: { label: string; text: string }[] } {
  const all = Array.isArray(req.source) ? req.source.map(String) : [];
  const footnotes = all.filter((s) => !ID_REF.test(s)).map((text, i) => ({ label: `${String(req.id)}-${i + 1}`, text }));
  const ids = all.filter((s) => ID_REF.test(s));
  const refs = footnotes.map((f) => `[^${f.label}]`).join("");
  return { sourceList: ids.length ? `${ids.join(", ")}${refs}` : refs ? `see the note${refs}` : "", footnotes };
}

const quoted = (text: unknown) => String(text ?? "").split("\n").join("\n> ");

function steps(criterion: Rec): { keyword: string; text: string }[] {
  const out: { keyword: string; text: string }[] = [];
  (Array.isArray(criterion.given) ? criterion.given : []).forEach((text, i) => out.push({ keyword: i === 0 ? "Given" : "And", text: String(text) }));
  if (criterion.when !== undefined) out.push({ keyword: "When", text: String(criterion.when) });
  (Array.isArray(criterion.then) ? criterion.then : []).forEach((text, i) => out.push({ keyword: i === 0 ? "Then" : "And", text: String(text) }));
  return out;
}

function table(rows: Rec[]): { header: string[]; rows: string[][] } | null {
  if (rows.length === 0) return null;
  const header = Object.keys(rows[0]!);
  return { header, rows: rows.map((row) => header.map((key) => String(row[key] ?? ""))) };
}

const natural = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });

export function missingLines(feature: Feature, validation: ValidationResult): { text: string }[] {
  const owners = [...indexIds(feature)].map(([id, pointers]) => ({ id, pointer: pointers[0]! }));
  const ownerOf = (pointer: string) =>
    owners.filter((o) => pointer === o.pointer || pointer.startsWith(`${o.pointer}/`)).sort((a, b) => b.pointer.length - a.pointer.length)[0]?.id ?? null;
  const tests = list(feature.tests);
  const lines = validation.errors.map((e) => {
    const testMatch = /^\/tests\/(\d+)/.exec(e.pointer);
    const test = testMatch ? tests[Number(testMatch[1])] : undefined;
    const subject = test ? (Array.isArray(test.verifies) && test.verifies.length ? String(test.verifies[0]) : `test ${Number(testMatch![1]) + 1}`) : ownerOf(e.pointer);
    const field = e.pointer.split("/").filter(Boolean).at(-1) ?? "";
    const required = /^missing: "(.+)" is required/.exec(e.message);
    let todo: string;
    if (/ is still open$/.test(e.message)) todo = "question to answer";
    else if (/has no criterion/.test(e.message)) todo = "criterion to write";
    else if (/realized by no anchor/.test(e.message)) todo = "anchor to place";
    else if (/verified by no test/.test(e.message)) todo = "test to declare";
    else if (/is not passing/.test(e.message)) todo = test?.status === "failing" ? "test to make pass" : "test to write";
    else if (/screen wireframe/.test(e.message)) todo = "screen wireframe to draw";
    else if (required) todo = `${required[1]} to fill in`;
    else if (e.kind === "incomplete") todo = `${field || "field"} to complete`;
    else todo = `inconsistent: ${e.message}`;
    return { text: subject ? `${subject} · ${todo}` : `${todo[0]!.toUpperCase()}${todo.slice(1)}` };
  });
  return lines.sort((a, b) => natural(a.text, b.text));
}

function coverage(feature: Feature): Rec {
  const tests = list(feature.tests);
  let verified = 0;
  const rows = list(feature.criteria).map((c) => {
    const mine = tests.filter((t) => Array.isArray(t.verifies) && t.verifies.includes(c.id));
    const justified = mine.length > 0 && mine.every((t) => (t.method ?? "test") !== "test");
    let status: string;
    if (mine.length === 0) status = "no test";
    else if (justified) status = `${mine.map((t) => enumLabel("test", "method", t.method) ?? String(t.method)).join(", ")}, justified`;
    else if (mine.some((t) => (t.method ?? "test") === "test" && t.status === "failing")) status = enumLabel("test", "status", "failing") ?? "failing";
    else if (mine.some((t) => (t.method ?? "test") === "test" && t.status !== "passing")) status = enumLabel("test", "status", "missing") ?? "missing";
    else status = enumLabel("test", "status", "passing") ?? "passing";
    if (justified || status === enumLabel("test", "status", "passing")) verified++;
    return { id: c.id, tests: mine.length, status };
  });
  return { coverage: rows, coverageTotal: { tests: tests.length, verified, criteria: rows.length } };
}

function warnings(feature: Feature, phase: string): string[] {
  const out: string[] = [];
  const framing = (feature.framing ?? {}) as Rec;
  const open = list(framing.questions).filter((q) => q.status === "open");
  if (open.length > 0) {
    out.push(`The ${phaseTitle(phase)} phase waits for your answers: ${open.length} open question(s), ${open.map((q) => String(q.id)).join(", ")}.`);
  }
  const producer = phaseProducing("tests");
  if (producer && phaseIndex(phase) >= phaseIndex(producer.name)) {
    const stale = list(feature.tests).filter((t) => (t.method ?? "test") === "test" && t.status !== "passing");
    if (stale.length > 0) out.push(`Verification to redo: ${stale.length} test(s) failing or not yet written.`);
  }
  return out;
}

function filesFor(feature: Feature, phase: string): FileSpec[] {
  const at = phaseIndex(phase);
  return FILE_SPECS.filter((spec) => {
    if (spec.section === null) return true;
    const producer = phaseProducing(spec.section);
    return producer ? phaseIndex(producer.name) <= at : list(feature[spec.section]).length > 0;
  });
}

function fileTitle(spec: FileSpec): string {
  return spec.section && phaseProducing(spec.section) ? phaseProducing(spec.section)!.title : spec.title;
}

function placeArtifacts(feature: Feature): Map<string, Rec[]> {
  const requirementIds = new Set(list(feature.requirements).map((r) => String(r.id)));
  const criterionIds = new Set(list(feature.criteria).map((c) => String(c.id)));
  const placed = new Map<string, Rec[]>();
  for (const artifact of list(feature.artifacts)) {
    const host = (Array.isArray(artifact.illustrates) ? artifact.illustrates.map(String) : []).find((id) => requirementIds.has(id) || criterionIds.has(id)) ?? "framing";
    const view = {
      ...artifact,
      kindLabel: label("artifactKind", artifact.kind),
      isMermaid: artifact.format === "mermaid",
      isSvg: artifact.format === "svg",
      isAscii: artifact.format === "ascii",
      host,
    };
    placed.set(host, [...(placed.get(host) ?? []), view]);
  }
  return placed;
}

function view(feature: Feature, validation: ValidationResult): Rec {
  const phase = validation.phase ?? phases[0]!.name;
  const at = phaseIndex(phase);
  const framing = (feature.framing ?? {}) as Rec;
  const artifacts = placeArtifacts(feature);
  const hostFile = (host: string) => (host === "framing" ? "framing.md" : host.startsWith("REQ-") ? "requirements.md" : "criteria.md");
  const requirements = list(feature.requirements).map(
    (req): Rec => ({ ...req, facetLabel: enumLabel("requirement", "facet", req.facet) ?? "to specify", anchor: headingSlug(`${String(req.id)}${req.title ? ` · ${String(req.title)}` : ""}`), patternLabel: label("pattern", req.pattern), ...sources(req), artifacts: artifacts.get(String(req.id)) ?? [] }),
  );
  const criteria = list(feature.criteria).map((c): Rec => ({ ...c, steps: steps(c), table: table(list(c.examples)), artifacts: artifacts.get(String(c.id)) ?? [] }));
  const lifecycle = (feature.lifecycle ?? {}) as Rec;
  const lastVerify = lifecycle.lastVerify as Rec | undefined;
  return {
    ...feature,
    phaseLabel: phaseTitle(phase),
    diagram: [
      ...phases.map((p, i) => (i === at ? `  ${p.name}(["${p.title} ◀ current"])` : `  ${p.name}["${p.title}"]`)),
      ...phases.slice(1).map((p, i) => `  ${phases[i]!.name} ${i + 1 <= at ? "-->" : "-.->"} ${p.name}`),
    ].join("\n"),
    documents: filesFor(feature, phase)
      .filter((f) => f.section !== null)
      .map((f) => ({ path: f.path, label: fileTitle(f), description: phaseProducing(f.section!)?.summary ?? "decisions and their consequences" })),
    missing: missingLines(feature, validation),
    questionList: list(framing.questions).map((q) => ({ id: q.id, question: q.question, done: q.status === "answered" })),
    warnings: warnings(feature, phase),
    history: list(lifecycle.phaseHistory).map((h) => ({
      date: String(h.date).slice(0, 10),
      label: phaseTitle(String(h.phase)),
      by: label("by", h.by),
      reason: typeof h.reason === "string" ? h.reason : null,
    })),
    lastVerify: lastVerify
      ? { date: String(lastVerify.date).slice(0, 10), applied: lastVerify.applied, reported: list(lastVerify.reported).length }
      : null,
    artifactIndex: [...artifacts.values()].flat().sort((a, b) => (String(a.id) < String(b.id) ? -1 : 1)).map((a) => ({ ...a, file: hostFile(String(a.host)) })),
    framing: {
      ...framing,
      artifacts: artifacts.get("framing") ?? [],
      openQuestions: list(framing.questions)
        .filter((q) => q.status !== "answered")
        .map((q) => ({ ...q, question: quoted(q.question), recommendation: q.recommendation ? quoted(q.recommendation) : null, aboutList: joined(q.about) })),
      answeredQuestions: list(framing.questions)
        .filter((q) => q.status === "answered")
        .map((q) => ({
          ...q,
          question: quoted(q.question),
          answer: q.answer ? quoted(q.answer) : null,
          recommendation: q.recommendation ? quoted(q.recommendation) : null,
          aboutList: joined(q.about),
        })),
      glossary: list(framing.glossary).map((g) => ({ ...g, avoidList: joined(g.avoid) })),
    },
    requirements,
    groups: requirements.map((requirement) => ({ requirement, criteria: criteria.filter((c) => c.requirement === requirement.id) })),
    anchors: list(feature.anchors).map((a) => ({
      ...a,
      kindLabel: enumLabel("anchor", "kind", a.kind) ?? String(a.kind),
      changeLabel: enumLabel("anchor", "change", a.change) ?? String(a.change),
      realizesList: joined(a.realizes),
    })),
    tests: list(feature.tests).map((t) => ({
      ...t,
      frameworkLabel: enumLabel("test", "framework", t.framework) ?? String(t.framework),
      levelLabel: t.level ? enumLabel("test", "level", t.level) : null,
      methodLabel: t.method ? enumLabel("test", "method", t.method) : null,
      statusLabel: t.status ? enumLabel("test", "status", t.status) : null,
      verifiesList: joined(t.verifies),
    })),
    ...coverage(feature),
    decisions: list(feature.decisions).map((d) => ({ ...d, statusLabel: label("decisionStatus", d.status), affectsList: joined(d.affects) })),
  };
}

function normalize(text: string): string {
  const lines = text.split(/\r?\n/).map((line) => line.trimEnd());
  const out: string[] = [];
  for (const line of lines) {
    if (line === "" && (out.length === 0 || out[out.length - 1] === "")) continue;
    out.push(line);
  }
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  return `${out.join("\n")}\n`;
}

export function header(spec: { source: string; template: string }): string {
  return `<!-- source: ${JSON.stringify(spec.source)} template: ${JSON.stringify(`templates/${spec.template}`)} -->`;
}

export function parseHeader(line: string): { source: string; template: string } | null {
  const match = /^<!-- source: ("(?:[^"\\]|\\.)*") template: ("(?:[^"\\]|\\.)*") -->$/.exec(line);
  return match ? { source: JSON.parse(match[1]!) as string, template: JSON.parse(match[2]!) as string } : null;
}

function pastNotice(spec: FileSpec, phase: string): string | null {
  const producer = spec.section ? phaseProducing(spec.section) : null;
  if (!producer || phaseIndex(producer.name) >= phaseIndex(phase)) return null;
  const current = phaseInfo(phase);
  const currentFile = FILE_SPECS.find((f) => f.section !== null && current?.produces.includes(f.section))?.path ?? "index.md";
  return `_Document of the closed ${producer.title} phase; the current phase is ${current?.title ?? phase}: [${currentFile}](${currentFile})._`;
}

function documentOrder(spec: FileSpec): number {
  if (spec.section === null) return -1;
  const producer = phaseProducing(spec.section);
  return producer ? phaseIndex(producer.name) : phases.length;
}

function documentLabel(spec: FileSpec): string {
  return spec.section === null ? "Index" : fileTitle(spec);
}

function navigation(feature: Feature, spec: FileSpec, produced: FileSpec[]): { top: string; bottom: string } {
  const ordered = [...FILE_SPECS].sort((a, b) => documentOrder(a) - documentOrder(b));
  const reached = new Set(produced.map((f) => f.path));
  const walk = ordered.filter((f) => reached.has(f.path));
  const at = walk.findIndex((f) => f.path === spec.path);
  const featureLabel = `${String(feature.id ?? "")} · ${String(feature.title ?? "")}`;
  const isIndex = spec.section === null;
  const crumbs = [
    { label: "All features", path: "../../README.md" },
    isIndex ? { label: featureLabel, path: null } : { label: featureLabel, path: "index.md" },
    ...(isIndex ? [] : [{ label: documentLabel(spec), path: null }]),
  ];
  const menu = isIndex
    ? []
    : ordered.map((f) => ({ label: documentLabel(f), path: reached.has(f.path) ? f.path : null, current: f.path === spec.path }));
  const link = (f: FileSpec | undefined) => (f ? { label: documentLabel(f), path: f.path } : null);
  const prev = link(walk[at - 1]);
  const next = link(walk[at + 1]);
  const nav = template("nav.hbs");
  return {
    top: nav({ crumbs, menu, bottom: false }),
    bottom: nav({ crumbs, menu, bottom: true, prev, next, steps: !!(prev || next), both: !!(prev && next) }),
  };
}

export function renderToMemory(feature: Feature): RenderedFile[] {
  const validation = validate(feature);
  const data = view(feature, validation);
  const phase = validation.phase ?? phases[0]!.name;
  const produced = filesFor(feature, phase);
  return produced.map((spec) => {
    const nav = navigation(feature, spec, produced);
    const body = template(spec.template)({ ...data, pastNotice: pastNotice(spec, phase) });
    return {
      path: spec.path,
      source: spec.source,
      template: `templates/${spec.template}`,
      content: normalize(`${header(spec)}\n\n${nav.top}\n${body}\n\n${nav.bottom}`),
    };
  });
}

export const sha256 = (text: string | Buffer): string => createHash("sha256").update(text).digest("hex");

export interface ManifestEntry {
  hash: string;
  renderedAt: string;
}

export interface Manifest {
  feature: ManifestEntry | null;
  files: Record<string, ManifestEntry>;
  assets: Record<string, ManifestEntry>;
}

const manifestPath = (folder: string, options: Location) => join(featureDir(folder, options), ".manifest.json");

export async function readManifest(folder: string, options: Location = {}): Promise<Manifest | null> {
  try {
    const raw = JSON.parse(await readFile(manifestPath(folder, options), "utf8")) as Partial<Manifest>;
    return { feature: raw.feature ?? null, files: raw.files ?? {}, assets: raw.assets ?? {} };
  } catch {
    return null;
  }
}

function entry(previous: ManifestEntry | undefined | null, hash: string, now: string): ManifestEntry {
  return previous && previous.hash === hash ? previous : { hash, renderedAt: now };
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

export async function svgPaths(feature: Feature): Promise<string[]> {
  return list(feature.artifacts)
    .filter((a) => a.format === "svg" && typeof a.path === "string")
    .map((a) => String(a.path))
    .sort();
}

export async function assetHashes(folder: string, feature: Feature, options: Location = {}): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  for (const path of await svgPaths(feature)) {
    try {
      out[path] = sha256(await readFile(join(featureDir(folder, options), path)));
    } catch {
      out[path] = null;
    }
  }
  return out;
}

export async function listRenderedOnDisk(folder: string, options: Location = {}): Promise<string[]> {
  const out: string[] = [];
  const walk = async (dir: string, prefix: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(join(dir, entry.name), rel);
      else if (entry.name.endsWith(".md")) out.push(rel);
    }
  };
  await walk(renderedDir(folder, options), "");
  return out.sort();
}

export interface GuardOptions extends Location {
  trustedFeature?: boolean;
}

export async function ownerEditedFiles(folder: string, next: RenderedFile[], feature: Feature, options: GuardOptions = {}): Promise<string[]> {
  const manifest = await readManifest(folder, options);
  const edited: string[] = [];
  if (manifest?.feature && !options.trustedFeature) {
    const raw = await readOptional(featureFile(folder, options));
    if (raw === null || sha256(raw) !== manifest.feature.hash) edited.push("feature.json");
  }
  const nextByPath = new Map(next.map((f) => [f.path, f.content]));
  const paths = new Set([...(await listRenderedOnDisk(folder, options)), ...Object.keys(manifest?.files ?? {})]);
  for (const path of [...paths].sort()) {
    const disk = await readOptional(join(renderedDir(folder, options), path));
    if (disk === null) {
      if (manifest?.files[path]) edited.push(path);
      continue;
    }
    if (disk === nextByPath.get(path)) continue;
    if (manifest?.files[path]?.hash !== sha256(disk)) edited.push(path);
  }
  const assets = await assetHashes(folder, feature, options);
  for (const [path, hash] of Object.entries(assets)) {
    const known = manifest?.assets[path]?.hash;
    if (known !== undefined && hash !== null && known !== hash) edited.push(path);
  }
  return edited;
}

export interface RenderOptions extends GuardOptions {
  force?: boolean;
  now?: string;
}

export const stamp = (now: string) => now.replace(/[:.]/g, "-");
export const lastGoodPath = (folder: string, options: Location) => join(stateDir(folder, options), "feature.last.json");

export async function backup(folder: string, relative: string, content: string, now: string, options: Location): Promise<string> {
  const rel = `.spec-loop/overwritten/${stamp(now)}/${relative}`;
  const target = join(featureDir(folder, options), rel);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
  return rel;
}

export async function render(ref: string, options: RenderOptions = {}): Promise<RenderResult> {
  const folder = await resolveFeature(ref, options);
  const json = await loadFeature(folder, options);
  const validation = validate(json);
  const files = renderToMemory(json);
  const edited = await ownerEditedFiles(folder, files, json, options);
  const result: RenderResult = { ok: true, feature: folder, files: [], removed: [], backedUp: [], refused: [], validation };
  if (edited.length > 0 && !options.force) return { ...result, ok: false, refused: edited };
  const now = options.now ?? new Date().toISOString();
  const base = renderedDir(folder, options);
  const produced = new Set(files.map((f) => f.path));
  for (const path of edited.filter((p) => p.endsWith(".md"))) {
    const disk = await readOptional(join(base, path));
    if (disk === null) continue;
    result.backedUp.push(await backup(folder, `rendered/${path}`, disk, now, options));
    if (!produced.has(path)) {
      await rm(join(base, path), { force: true });
      result.removed.push(path);
    }
  }
  const manifest = await readManifest(folder, options);
  for (const path of Object.keys(manifest?.files ?? {}).sort()) {
    if (produced.has(path) || result.removed.includes(path)) continue;
    await rm(join(base, path), { force: true });
    result.removed.push(path);
  }
  for (const file of files) {
    const target = join(base, file.path);
    const changed = (await readOptional(target)) !== file.content;
    if (changed) {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content);
    }
    result.files.push({ path: file.path, source: file.source, template: file.template, changed });
  }
  const assets = Object.entries(await assetHashes(folder, json, options)).filter((e): e is [string, string] => e[1] !== null);
  const featureRaw = await readFile(featureFile(folder, options), "utf8");
  const featureHash = sha256(featureRaw);
  await mkdir(stateDir(folder, options), { recursive: true });
  await writeFile(lastGoodPath(folder, options), featureRaw);
  const nextManifest: Manifest = {
    feature: entry(manifest?.feature, featureHash, now),
    files: Object.fromEntries(files.map((f) => [f.path, entry(manifest?.files[f.path], sha256(f.content), now)])),
    assets: Object.fromEntries(assets.map(([path, hash]) => [path, entry(manifest?.assets[path], hash, now)])),
  };
  await writeFile(manifestPath(folder, options), `${JSON.stringify(nextManifest, null, 2)}\n`);
  const { writeSpecIndex } = await import("./features.js");
  await writeSpecIndex(options);
  return result;
}
