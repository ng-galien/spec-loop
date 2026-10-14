import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const schemaPath = join(packageRoot, "schema", "feature.schema.json");
export const templatesDir = join(packageRoot, "templates");
export const methodDir = join(packageRoot, "method");

export interface Location {
  root?: string;
}

const usable = (value: string | undefined): value is string => typeof value === "string" && value !== "" && !value.includes("${");

export function workspaceRoot(options: Location = {}): string {
  const candidates = [options.root, process.env.SPEC_LOOP_ROOT, process.env.CLAUDE_PROJECT_DIR];
  return resolve(candidates.find(usable) ?? process.cwd());
}

export function specDir(options: Location = {}): string {
  return join(workspaceRoot(options), "spec");
}

export function featureDir(folder: string, options: Location = {}): string {
  if (!/^FEAT-\d{3}-[a-z0-9]+(-[a-z0-9]+)*$/.test(folder)) throw new Error(`invalid feature folder "${folder}"`);
  return join(specDir(options), folder);
}

export const specSchemaCopy = (options: Location = {}) => join(specDir(options), "feature.schema.json");
export const featureFile = (folder: string, options: Location = {}) => join(featureDir(folder, options), "feature.json");
export const renderedDir = (folder: string, options: Location = {}) => join(featureDir(folder, options), "rendered");
export const assetsDir = (folder: string, options: Location = {}) => join(featureDir(folder, options), "assets");
export const stateDir = (folder: string, options: Location = {}) => join(featureDir(folder, options), ".spec-loop");
