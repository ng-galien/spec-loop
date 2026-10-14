import { readFileSync } from "node:fs";
import { schemaPath } from "./paths.js";

export interface PhaseInfo {
  name: string;
  title: string;
  summary: string;
  description: string;
  produces: string[];
  granularity: string;
  checks: string[];
}

export type JsonSchema = Record<string, unknown>;

export const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as JsonSchema;
export const phases: readonly PhaseInfo[] = schema["x-phases"] as PhaseInfo[];
export const checkDescriptions = (schema["x-checks"] ?? {}) as Record<string, string>;

export const phaseNames = (): string[] => phases.map((p) => p.name);
export const firstPhase = (): string => phases[0]!.name;
export const phaseIndex = (name: string | null | undefined): number => phases.findIndex((p) => p.name === name);
export const phaseInfo = (name: string | null | undefined): PhaseInfo | null => phases.find((p) => p.name === name) ?? null;
export const nextPhase = (name: string | null | undefined): string | null => {
  const i = phaseIndex(name);
  return i < 0 ? null : (phases[i + 1]?.name ?? null);
};
export const phaseProducing = (section: string): PhaseInfo | null => phases.find((p) => p.produces.includes(section)) ?? null;
export const activeChecks = (name: string | null | undefined): Set<string> =>
  new Set(phases.slice(0, Math.max(phaseIndex(name), 0) + 1).flatMap((p) => p.checks));

export function resolveRef(ref: string): JsonSchema {
  if (!ref.startsWith("#/")) throw new Error(`unsupported $ref ${ref}`);
  let node: unknown = schema;
  for (const token of ref.slice(2).split("/")) node = (node as JsonSchema)[token];
  return node as JsonSchema;
}
