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
  { path: "index.md", source: "", template: "index.hbs", section: null, title: "Vue d'ensemble" },
  { path: "cadrage.md", source: "/framing", template: "framing.hbs", section: "framing", title: "" },
  { path: "exigences.md", source: "/requirements", template: "requirements.hbs", section: "requirements", title: "" },
  { path: "criteres.md", source: "/criteria", template: "criteria.hbs", section: "criteria", title: "" },
  { path: "ancrage.md", source: "/anchors", template: "anchors.hbs", section: "anchors", title: "" },
  { path: "verification.md", source: "/tests", template: "tests.hbs", section: "tests", title: "" },
  { path: "decisions.md", source: "/decisions", template: "decisions.hbs", section: "decisions", title: "Décisions" },
];

const LABELS: Record<string, Record<string, string>> = {
  pattern: { ubiquitous: "permanente", event: "sur événement", state: "sur état", unwanted: "comportement indésirable", optional: "option", complex: "complexe" },
  change: { add: "ajout", modify: "modification", remove: "suppression" },
  testStatus: { missing: "à écrire", failing: "en échec", passing: "réussi" },
  decisionStatus: { proposed: "proposée", accepted: "acceptée", superseded: "remplacée" },
  artifactKind: { context: "contexte", flow: "flux", sequence: "séquence", state: "états", screen: "écran", module: "modules" },
  by: { agent: "l'agent", owner: "le propriétaire" },
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

const label = (table: string, value: unknown) => LABELS[table]![String(value)] ?? "à préciser";
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
  return { sourceList: ids.length ? `${ids.join(", ")}${refs}` : refs ? `voir la note${refs}` : "", footnotes };
}

const quoted = (text: unknown) => String(text ?? "").split("\n").join("\n> ");

function steps(criterion: Rec): { keyword: string; text: string }[] {
  const out: { keyword: string; text: string }[] = [];
  (Array.isArray(criterion.given) ? criterion.given : []).forEach((text, i) => out.push({ keyword: i === 0 ? "Soit" : "Et", text: String(text) }));
  if (criterion.when !== undefined) out.push({ keyword: "Quand", text: String(criterion.when) });
  (Array.isArray(criterion.then) ? criterion.then : []).forEach((text, i) => out.push({ keyword: i === 0 ? "Alors" : "Et", text: String(text) }));
  return out;
}

function table(rows: Rec[]): { header: string[]; rows: string[][] } | null {
  if (rows.length === 0) return null;
  const header = Object.keys(rows[0]!);
  return { header, rows: rows.map((row) => header.map((key) => String(row[key] ?? ""))) };
}

export function missingLines(feature: Feature, validation: ValidationResult): { pointer: string; text: string }[] {
  const owners = [...indexIds(feature)].map(([id, pointers]) => ({ id, pointer: pointers[0]! }));
  const ownerOf = (pointer: string) =>
    owners.filter((o) => pointer === o.pointer || pointer.startsWith(`${o.pointer}/`)).sort((a, b) => b.pointer.length - a.pointer.length)[0]?.id ?? null;
  return validation.errors.map((e) => {
    const owner = ownerOf(e.pointer);
    const state = e.kind === "incomplete" ? "à compléter" : "incohérent";
    return {
      pointer: e.pointer || "/",
      text: / is still open$/.test(e.message) ? `Question ${owner ?? ""} à répondre` : owner ? `${owner} ${state}` : `${state[0]!.toUpperCase()}${state.slice(1)}`,
    };
  });
}

function warnings(feature: Feature, phase: string): string[] {
  const out: string[] = [];
  const framing = (feature.framing ?? {}) as Rec;
  const open = list(framing.questions).filter((q) => q.status === "open");
  if (open.length > 0) {
    out.push(`La phase « ${phaseTitle(phase)} » attend vos réponses : ${open.length} question(s) ouverte(s), ${open.map((q) => String(q.id)).join(", ")}.`);
  }
  const producer = phaseProducing("tests");
  if (producer && phaseIndex(phase) >= phaseIndex(producer.name)) {
    const stale = list(feature.tests).filter((t) => t.status !== "passing");
    if (stale.length > 0) out.push(`Vérification à refaire : ${stale.length} test(s) en échec ou pas encore écrit(s).`);
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
  const hostFile = (host: string) => (host === "framing" ? "cadrage.md" : host.startsWith("REQ-") ? "exigences.md" : "criteres.md");
  const requirements = list(feature.requirements).map(
    (req): Rec => ({ ...req, facetLabel: enumLabel("requirement", "facet", req.facet) ?? "à préciser", anchor: headingSlug(`${String(req.id)}${req.title ? ` · ${String(req.title)}` : ""}`), patternLabel: label("pattern", req.pattern), ...sources(req), artifacts: artifacts.get(String(req.id)) ?? [] }),
  );
  const criteria = list(feature.criteria).map((c): Rec => ({ ...c, steps: steps(c), table: table(list(c.examples)), artifacts: artifacts.get(String(c.id)) ?? [] }));
  const lifecycle = (feature.lifecycle ?? {}) as Rec;
  const lastVerify = lifecycle.lastVerify as Rec | undefined;
  return {
    ...feature,
    phaseLabel: phaseTitle(phase),
    diagram: [
      ...phases.map((p, i) => (i === at ? `  ${p.name}(["${p.title} ◀ actuelle"])` : `  ${p.name}["${p.title}"]`)),
      ...phases.slice(1).map((p, i) => `  ${phases[i]!.name} ${i + 1 <= at ? "-->" : "-.->"} ${p.name}`),
    ].join("\n"),
    documents: filesFor(feature, phase)
      .filter((f) => f.section !== null)
      .map((f) => ({ path: f.path, label: fileTitle(f), description: phaseProducing(f.section!)?.summary ?? "décisions et leurs conséquences" })),
    missing: missingLines(feature, validation),
    questionList: list(framing.questions).map((q) => ({ id: q.id, question: q.question, done: q.status === "answered" })),
    warnings: warnings(feature, phase),
    history: list(lifecycle.phaseHistory).map((h) => ({ date: String(h.date).slice(0, 10), label: phaseTitle(String(h.phase)), by: label("by", h.by) })),
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
    anchors: list(feature.anchors).map((a) => ({ ...a, changeLabel: label("change", a.change), realizesList: joined(a.realizes) })),
    tests: list(feature.tests).map((t) => ({ ...t, statusLabel: t.status ? label("testStatus", t.status) : null, verifiesList: joined(t.verifies) })),
    coverage: list(feature.criteria).map((c) => ({
      id: c.id,
      tests: list(feature.tests).filter((t) => Array.isArray(t.verifies) && t.verifies.includes(c.id)).length,
    })),
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
  return `_Document de la phase ${producer.title}, close ; la phase actuelle est ${current?.title ?? phase} : [${currentFile}](${currentFile})._`;
}

export function renderToMemory(feature: Feature): RenderedFile[] {
  const validation = validate(feature);
  const data = view(feature, validation);
  const phase = validation.phase ?? phases[0]!.name;
  return filesFor(feature, phase).map((spec) => ({
    path: spec.path,
    source: spec.source,
    template: `templates/${spec.template}`,
    content: normalize(`${header(spec)}\n\n${template(spec.template)({ ...data, pastNotice: pastNotice(spec, phase) })}`),
  }));
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
