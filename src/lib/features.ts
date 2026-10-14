import { readFileSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import Handlebars from "handlebars";
import { diffFolder } from "./diff.js";
import { featureFolders, serializeFeature } from "./model.js";
import { featureDir, featureFile, schemaPath, specDir, templatesDir, type Location } from "./paths.js";
import { phaseTitle, render } from "./render.js";
import { firstPhase, nextPhase } from "./schema.js";
import type { Feature, RenderResult, ValidationError } from "./types.js";
import { validate } from "./validate.js";

export interface FeatureSummary {
  id: string;
  name: string;
  folder: string;
  title: string | null;
  phase: string | null;
  complete: boolean;
  missingCount: number;
  missingForNext: ValidationError[];
  ownerEdits: "none" | "pending";
  alterations: number;
  modified: string;
}

async function summarize(folder: string, options: Location): Promise<FeatureSummary | null> {
  const file = featureFile(folder, options);
  let json: Feature;
  try {
    json = JSON.parse(await readFile(file, "utf8")) as Feature;
  } catch {
    return null;
  }
  const now = validate(json);
  const next = nextPhase(now.phase);
  const d = await diffFolder(folder, options);
  return {
    id: String(json.id ?? ""),
    name: String(json.name ?? ""),
    folder,
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
  for (const { folder } of await featureFolders(options)) {
    const summary = await summarize(folder, options);
    if (summary) out.push(summary);
  }
  return out;
}

const indexTemplate = Handlebars.create().compile(readFileSync(join(templatesDir, "spec-index.hbs"), "utf8"), { noEscape: true });

export async function writeSpecIndex(options: Location = {}): Promise<string> {
  const list = await features(options);
  const content = `${indexTemplate({
    features: list.map((f) => ({ ...f, phaseLabel: phaseTitle(f.phase), pending: f.ownerEdits === "pending" })),
  }).trim()}\n`;
  await mkdir(specDir(options), { recursive: true });
  await writeFile(join(specDir(options), "README.md"), content);
  return "spec/README.md";
}

export interface CreateResult {
  ok: boolean;
  feature: string | null;
  id: string | null;
  errors: ValidationError[];
  render: RenderResult | null;
}

export async function create(name: string, title: string, options: Location & { now?: string } = {}): Promise<CreateResult> {
  const fail = (message: string): CreateResult => ({ ok: false, feature: null, id: null, errors: [{ pointer: "", message, kind: "invalid" }], render: null });
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) return fail(`invalid name "${name}": use lowercase words separated by dashes`);
  const existing = await featureFolders(options);
  if (existing.some((f) => f.name === name)) return fail(`a feature named "${name}" already exists`);
  const number = Math.max(0, ...existing.map((f) => Number(f.id.slice(5)))) + 1;
  const id = `FEAT-${String(number).padStart(3, "0")}`;
  const folder = `${id}-${name}`;
  const now = options.now ?? new Date().toISOString();
  const phase = firstPhase();
  const skeleton: Feature = {
    $schema: relative(featureDir(folder, options), schemaPath).split("\\").join("/"),
    id,
    name,
    title,
    phase,
    framing: { intent: "", actors: [], scope: { in: [], out: [] }, constraints: [], assumptions: [], questions: [], glossary: [] },
    lifecycle: { created: now, phaseHistory: [{ phase, date: now, by: "agent" }] },
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
