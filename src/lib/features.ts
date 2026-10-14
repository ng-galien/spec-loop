import { readFileSync } from "node:fs";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import Handlebars from "handlebars";
import { diffFolder } from "./diff.js";
import { featureFolders, serializeFeature } from "./model.js";
import { featureDir, featureFile, schemaPath, specDir, specSchemaCopy, templatesDir, workspaceRoot, type Location } from "./paths.js";
import { phaseTitle, render } from "./render.js";
import { firstPhase, lastPhase, nextPhase, phases } from "./schema.js";
import type { Feature, RenderResult, ValidationError } from "./types.js";
import { validate } from "./validate.js";

export interface FeatureSummary {
  id: string;
  name: string;
  folder: string;
  path: string;
  corrupted: string | null;
  title: string | null;
  phase: string | null;
  complete: boolean;
  missingCount: number;
  missingForNext: ValidationError[];
  ownerEdits: "none" | "pending";
  alterations: number;
  modified: string;
}

async function summarize(folder: string, id: string, name: string, options: Location): Promise<FeatureSummary> {
  const file = featureFile(folder, options);
  let json: Feature;
  try {
    json = JSON.parse(await readFile(file, "utf8")) as Feature;
  } catch (error) {
    const modified = await stat(file).then((s) => s.mtime.toISOString(), () => "");
    return {
      id, name, folder, path: file, corrupted: (error as Error).message, title: null, phase: null, complete: false,
      missingCount: 0, missingForNext: [], ownerEdits: "pending", alterations: 1, modified,
    };
  }
  const now = validate(json);
  const next = nextPhase(now.phase);
  const d = await diffFolder(folder, options);
  return {
    id: String(json.id ?? ""),
    name: String(json.name ?? ""),
    folder,
    path: file,
    corrupted: null,
    title: typeof json.title === "string" ? json.title : null,
    phase: now.phase,
    complete: now.complete,
    missingCount: now.errors.length,
    missingForNext: next ? validate({ ...json, phase: next }).errors.filter((e) => e.kind === "incomplete") : [],
    ownerEdits: d.alterations.length > 0 ? "pending" : "none",
    alterations: d.alterations.length,
    modified: (await stat(file)).mtime.toISOString(),
  };
}

export async function features(options: Location = {}): Promise<FeatureSummary[]> {
  const out: FeatureSummary[] = [];
  for (const { folder, id, name } of await featureFolders(options)) out.push(await summarize(folder, id, name, options));
  return out;
}

export async function featuresReport(options: Location = {}): Promise<{ root: string; spec: string; features: FeatureSummary[] }> {
  return { root: workspaceRoot(options), spec: specDir(options), features: await features(options) };
}

const indexTemplate = Handlebars.create().compile(readFileSync(join(templatesDir, "spec-index.hbs"), "utf8"), { noEscape: true });

export async function writeSpecIndex(options: Location = {}): Promise<string> {
  const list = await features(options);
  const content = `${indexTemplate({
    features: list.map((f) => ({ ...f, phaseLabel: phaseTitle(f.phase), pending: f.ownerEdits === "pending" })),
    byPhase: [
      ...phases.map((p) => ({ label: p.title, features: list.filter((f) => f.phase === p.name).map((f) => ({ ...f, title: f.title ?? f.name })) })),
      ...(list.some((f) => f.corrupted) ? [{ label: "Corrupted file", features: list.filter((f) => f.corrupted).map((f) => ({ ...f, title: f.name })) }] : []),
    ],
  }).trim()}\n`;
  await mkdir(specDir(options), { recursive: true });
  await writeFile(join(specDir(options), "README.md"), content);
  await copyFile(schemaPath, specSchemaCopy(options));
  return "spec/README.md";
}

export interface CreateResult {
  ok: boolean;
  feature: string | null;
  id: string | null;
  errors: ValidationError[];
  render: RenderResult | null;
}

export interface CreateOptions extends Location {
  now?: string;
  by?: "agent" | "owner";
  reason?: string;
}

export async function create(name: string, title: string, options: CreateOptions = {}): Promise<CreateResult> {
  const fail = (...messages: string[]): CreateResult => ({ ok: false, feature: null, id: null, errors: messages.map((message) => ({ pointer: "", message, kind: "invalid" as const })), render: null });
  if (!options.root || !isAbsolute(options.root)) return fail("create needs root: the absolute path of the project that holds or will hold spec/");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) return fail(`invalid name "${name}": use lowercase words separated by dashes`);
  const existing = await featureFolders(options);
  if (existing.some((f) => f.name === name)) return fail(`a feature named "${name}" already exists`);
  const by = options.by ?? "agent";
  const reason = options.reason?.trim() ?? "";
  const unfinished = (await features(options)).filter((f) => f.phase !== lastPhase());
  if (unfinished.length > 0 && (by !== "owner" || reason === "")) {
    return fail(
      ...unfinished.map((f) =>
        f.corrupted
          ? `${f.folder} is unfinished: its feature.json cannot be read`
          : `${f.folder} is unfinished: phase "${f.phase}", ${f.missingCount} item(s) missing`,
      ),
      `one feature at a time: finish ${unfinished.map((f) => f.id).join(", ")} first; only the owner may open another one now, with by "owner" and a reason`,
    );
  }
  const number = Math.max(0, ...existing.map((f) => Number(f.id.slice(5)))) + 1;
  const id = `FEAT-${String(number).padStart(3, "0")}`;
  const folder = `${id}-${name}`;
  const now = options.now ?? new Date().toISOString();
  const phase = firstPhase();
  const skeleton: Feature = {
    $schema: "../feature.schema.json",
    id,
    name,
    title,
    phase,
    framing: { intent: "", actors: [], scope: { in: [], out: [] } },
    lifecycle: {
      created: now,
      phaseHistory: [{ phase, date: now, by }],
      ...(unfinished.length > 0 ? { openedWhileUnfinished: { features: unfinished.map((f) => f.id), reason, date: now } } : {}),
    },
  };
  await mkdir(featureDir(folder, options), { recursive: true });
  try {
    await stat(featureFile(folder, options));
    return fail(`spec/${folder}/feature.json already exists`);
  } catch {
    await writeFile(featureFile(folder, options), serializeFeature(skeleton));
  }
  return { ok: true, feature: folder, id, errors: [], render: await render(folder, { ...options, now }) };
}
