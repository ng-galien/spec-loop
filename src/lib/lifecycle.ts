import { diffFolder } from "./diff.js";
import { loadFeature, resolveFeature } from "./model.js";
import type { Location } from "./paths.js";
import { patchFolder, touchesProtected } from "./patch.js";
import { nextPhase } from "./schema.js";
import type { Alteration, PatchOperation, PatchResult, ValidationError } from "./types.js";
import { validate } from "./validate.js";

export type Author = "agent" | "owner";

export interface StatusResult {
  id: string;
  name: string;
  folder: string;
  title: string | null;
  phase: string | null;
  nextPhase: string | null;
  completeness: { state: "complete" | "incomplete"; missing: ValidationError[] };
  ownerEdits: { state: "none" | "pending"; files: number; hunks: number; ids: string[] };
  alterations: Alteration[];
  lastVerify: { date: string; applied: number; reported: { file: string; pointer: string | null; reason: string }[] } | null;
  phaseHistory: { phase: string; date: string; by: Author }[];
}

export async function statusFolder(folder: string, options: Location = {}): Promise<StatusResult> {
  const json = await loadFeature(folder, options);
  const validation = validate(json);
  const d = await diffFolder(folder, options);
  const lifecycle = (json.lifecycle ?? {}) as { lastVerify?: StatusResult["lastVerify"]; phaseHistory?: StatusResult["phaseHistory"] };
  return {
    id: String(json.id ?? ""),
    name: String(json.name ?? ""),
    folder,
    title: typeof json.title === "string" ? json.title : null,
    phase: validation.phase,
    nextPhase: nextPhase(validation.phase),
    completeness: { state: validation.complete ? "complete" : "incomplete", missing: validation.errors },
    ownerEdits: { state: d.alterations.length > 0 ? "pending" : "none", ...d.ownerEdits },
    alterations: d.alterations,
    lastVerify: lifecycle.lastVerify ?? null,
    phaseHistory: lifecycle.phaseHistory ?? [],
  };
}

export async function status(ref: string, options: Location = {}): Promise<StatusResult> {
  return statusFolder(await resolveFeature(ref, options), options);
}

export interface PhaseResult {
  ok: boolean;
  feature: string;
  from: string | null;
  to: string | null;
  reasons: string[];
  missing: ValidationError[];
  patch: PatchResult | null;
}

export async function advancePhase(ref: string, options: Location & { by?: Author; now?: string } = {}): Promise<PhaseResult> {
  const folder = await resolveFeature(ref, options);
  const current = await statusFolder(folder, options);
  const reasons: string[] = [];
  if (!current.nextPhase) reasons.push(`phase "${current.phase}" is the last one`);
  if (current.completeness.state !== "complete") reasons.push(`phase "${current.phase}" is incomplete: ${current.completeness.missing.length} item(s) missing`);
  if (current.ownerEdits.state === "pending") reasons.push(`${current.ownerEdits.hunks} owner edit(s) or alteration(s) pending: run the verify skill first`);
  if (reasons.length > 0) {
    return { ok: false, feature: folder, from: current.phase, to: current.nextPhase, reasons, missing: current.completeness.missing, patch: null };
  }
  const now = options.now ?? new Date().toISOString();
  const result = await patchFolder(
    folder,
    [
      { op: "replace", path: "/phase", value: current.nextPhase },
      { op: "add", path: "/lifecycle/phaseHistory/-", value: { phase: current.nextPhase, date: now, by: options.by ?? "agent" } },
    ],
    { ...options, allowProtected: true, now },
  );
  return {
    ok: result.ok,
    feature: folder,
    from: current.phase,
    to: current.nextPhase,
    reasons: result.ok ? [] : result.errors.map((e) => e.message),
    missing: result.validation?.errors ?? [],
    patch: result,
  };
}

export interface VerifyInput {
  ops: PatchOperation[];
  applied: number;
  reported: { file: string; pointer: string | null; reason: string }[];
}

export interface VerifyResult {
  ok: boolean;
  feature: string;
  pending: number;
  applied: number;
  reported: number;
  errors: string[];
  patch: PatchResult | null;
}

export async function verify(ref: string, input: VerifyInput, options: Location & { now?: string } = {}): Promise<VerifyResult> {
  const folder = await resolveFeature(ref, options);
  const d = await diffFolder(folder, options);
  const pending = d.ownerEdits.hunks;
  const base = { feature: folder, pending, applied: input.applied, reported: input.reported.length };
  const blocked = input.ops.filter((op) => touchesProtected(op.path) || touchesProtected(op.from));
  if (blocked.length > 0) {
    return { ...base, ok: false, errors: blocked.map((op) => `${op.path}: id, name, phase and lifecycle cannot be patched`), patch: null };
  }
  if (input.applied + input.reported.length !== pending) {
    return {
      ...base,
      ok: false,
      errors: [`${pending} pending hunk(s) or alteration(s), but applied (${input.applied}) + reported (${input.reported.length}) = ${input.applied + input.reported.length}; account for each one`],
      patch: null,
    };
  }
  const json = await loadFeature(folder, options);
  const now = options.now ?? new Date().toISOString();
  const lastVerify = { date: now, applied: input.applied, reported: input.reported };
  const lifecycleOp: PatchOperation = (json.lifecycle as { lastVerify?: unknown } | undefined)?.lastVerify
    ? { op: "replace", path: "/lifecycle/lastVerify", value: lastVerify }
    : { op: "add", path: "/lifecycle/lastVerify", value: lastVerify };
  const result = await patchFolder(folder, [...input.ops, lifecycleOp], { ...options, force: true, allowProtected: true, now });
  return { ...base, ok: result.ok, errors: result.errors.map((e) => `${e.pointer}: ${e.message}`), patch: result };
}
