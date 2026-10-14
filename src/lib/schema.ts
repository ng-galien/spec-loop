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
  skill: string;
  instructions: PhaseInstructions;
}

export interface PhaseInstructions {
  onEnter: string;
  onIncomplete: string;
  beforeLeave: string;
}

export type JsonSchema = Record<string, unknown>;

export const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as JsonSchema;
export const phases: readonly PhaseInfo[] = schema["x-phases"] as PhaseInfo[];
export interface CheckRule {
  description: string;
  gate?: "entry";
  requirement?: Record<string, unknown>;
  artifact?: Record<string, unknown>;
  message?: string;
}

const rawChecks = (schema["x-checks"] ?? {}) as Record<string, string | CheckRule>;
export const checkRules: Record<string, CheckRule> = Object.fromEntries(
  Object.entries(rawChecks).map(([name, value]) => [name, typeof value === "string" ? { description: value } : value]),
);
export const checkDescriptions: Record<string, string> = Object.fromEntries(Object.entries(checkRules).map(([name, rule]) => [name, rule.description]));

export const phaseNames = (): string[] => phases.map((p) => p.name);
export const firstPhase = (): string => phases[0]!.name;
export const lastPhase = (): string => phases[phases.length - 1]!.name;
export const phaseIndex = (name: string | null | undefined): number => phases.findIndex((p) => p.name === name);
export const phaseInfo = (name: string | null | undefined): PhaseInfo | null => phases.find((p) => p.name === name) ?? null;
export const nextPhase = (name: string | null | undefined): string | null => {
  const i = phaseIndex(name);
  return i < 0 ? null : (phases[i + 1]?.name ?? null);
};
export const phaseProducing = (section: string): PhaseInfo | null => phases.find((p) => p.produces.includes(section)) ?? null;
export const activeChecks = (name: string | null | undefined): Set<string> => {
  const at = Math.max(phaseIndex(name), 0);
  const active = new Set(phases.slice(0, at + 1).flatMap((p) => p.checks));
  const next = phases[at + 1];
  for (const check of next?.checks ?? []) if (checkRules[check]?.gate === "entry" || next!.produces.length === 0) active.add(check);
  return active;
};

export function enumLabel(def: string, property: string, value: unknown): string | null {
  const node = ((resolveRef(`#/$defs/${def}`).properties ?? {}) as Record<string, JsonSchema>)[property];
  const labels = (node?.["x-labels"] ?? {}) as Record<string, string>;
  return labels[String(value)] ?? null;
}

export function resolveRef(ref: string): JsonSchema {
  if (!ref.startsWith("#/")) throw new Error(`unsupported $ref ${ref}`);
  let node: unknown = schema;
  for (const token of ref.slice(2).split("/")) node = (node as JsonSchema)[token];
  return node as JsonSchema;
}
