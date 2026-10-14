import { readdir, readFile } from "node:fs/promises";
import { featureFile, specDir, type Location } from "./paths.js";
import type { Feature } from "./types.js";

export const ID_PATTERN = /^(?:(?:ACT|CON|ASM|Q)-\d{2}|REQ-\d{3}|AC-\d{3}\.\d+|(?:ANC|DEC|ART)-\d{2,3})$/;
const FOLDER = /^(FEAT-\d{3})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

export function escapePointerToken(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}

export function indexIds(feature: unknown): Map<string, string[]> {
  const index = new Map<string, string[]>();
  const walk = (node: unknown, pointer: string): void => {
    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${pointer}/${i}`));
      return;
    }
    if (node === null || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (pointer !== "" && typeof record.id === "string" && ID_PATTERN.test(record.id)) {
      const list = index.get(record.id) ?? [];
      list.push(pointer);
      index.set(record.id, list);
    }
    for (const key of Object.keys(record)) walk(record[key], `${pointer}/${escapePointerToken(key)}`);
  };
  walk(feature, "");
  return index;
}

export interface FeatureFolder {
  folder: string;
  id: string;
  name: string;
}

export async function featureFolders(options: Location = {}): Promise<FeatureFolder[]> {
  let entries;
  try {
    entries = await readdir(specDir(options), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => FOLDER.exec(e.name))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ folder: m[0], id: m[1]!, name: m[2]! }))
    .sort((a, b) => (a.folder < b.folder ? -1 : 1));
}

export async function resolveFeature(ref: string, options: Location = {}): Promise<string> {
  const matches = (await featureFolders(options)).filter((f) => f.folder === ref || f.id === ref || f.name === ref);
  if (matches.length === 1) return matches[0]!.folder;
  if (matches.length === 0) throw new Error(`no feature "${ref}" under spec/: give its id (FEAT-001), its name or its folder`);
  throw new Error(`"${ref}" matches several features: ${matches.map((m) => m.folder).join(", ")}`);
}

export async function loadFeature(folder: string, options: Location = {}): Promise<Feature> {
  const raw = await readFile(featureFile(folder, options), "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`spec/${folder}/feature.json must hold a JSON object`);
  }
  return parsed as Feature;
}

export function serializeFeature(feature: unknown): string {
  return `${JSON.stringify(feature, null, 2)}\n`;
}
