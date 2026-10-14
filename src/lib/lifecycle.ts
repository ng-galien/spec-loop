import { readFile, writeFile } from "node:fs/promises";
import { diffFolder } from "./diff.js";
import { indexIds, loadFeature, resolveFeature } from "./model.js";
import { featureFile, specDir, workspaceRoot, type Location } from "./paths.js";
import { PROTECTED, patchFolder, touchesProtected } from "./patch.js";
import { backup, lastGoodPath } from "./render.js";
import { nextPhase, phaseIndex, phaseInfo, resolveRef, schema, type JsonSchema } from "./schema.js";
import type { Alteration, PatchOperation, PatchResult, ValidationError } from "./types.js";
import { validate } from "./validate.js";

export type Author = "agent" | "owner";

export interface Unaddressed {
  pointer: string;
  description: string;
}

export function unaddressedFields(json: Record<string, unknown>, phase: string | null): Unaddressed[] {
  const out: Unaddressed[] = [];
  for (const section of phaseInfo(phase)?.produces ?? []) {
    let node = (schema.properties as Record<string, JsonSchema>)[section]!;
    while (typeof node.$ref === "string") node = resolveRef(node.$ref);
    if (node.type !== "object") {
      if (json[section] === undefined) out.push({ pointer: `/${section}`, description: String(node.description ?? "") });
      continue;
    }
    const value = (json[section] ?? {}) as Record<string, unknown>;
    for (const [key, child] of Object.entries((node.properties ?? {}) as Record<string, JsonSchema>)) {
      if (value[key] === undefined) out.push({ pointer: `/${section}/${key}`, description: String(child.description ?? "") });
    }
  }
  return out;
}

export interface StatusResult {
  root: string;
  spec: string;
  file: string;
  id: string;
  name: string;
  folder: string;
  title: string | null;
  phase: string | null;
  nextPhase: string | null;
  completeness: { state: "complete" | "incomplete"; missing: ValidationError[] };
  unaddressed: Unaddressed[];
  ownerEdits: { state: "none" | "pending"; files: number; hunks: number; ids: string[] };
  alterations: Alteration[];
  lastVerify: { date: string; applied: number; reported: { file: string; pointer: string | null; reason: string }[] } | null;
  phaseHistory: { phase: string; date: string; by: Author; reason?: string }[];
  lastBackwardMove: { from: string; to: string; date: string; by: Author; reason: string } | null;
}

function lastBackward(history: StatusResult["phaseHistory"]): StatusResult["lastBackwardMove"] {
  for (let i = history.length - 1; i > 0; i--) {
    const entry = history[i]!;
    const before = history[i - 1]!;
    if (phaseIndex(entry.phase) < phaseIndex(before.phase)) {
      return { from: before.phase, to: entry.phase, date: entry.date, by: entry.by, reason: entry.reason ?? "" };
    }
  }
  return null;
}

export async function statusFolder(folder: string, options: Location = {}): Promise<StatusResult> {
  const json = await loadFeature(folder, options);
  const validation = validate(json);
  const d = await diffFolder(folder, options);
  const lifecycle = (json.lifecycle ?? {}) as { lastVerify?: StatusResult["lastVerify"]; phaseHistory?: StatusResult["phaseHistory"] };
  return {
    root: workspaceRoot(options),
    spec: specDir(options),
    file: featureFile(folder, options),
    id: String(json.id ?? ""),
    name: String(json.name ?? ""),
    folder,
    title: typeof json.title === "string" ? json.title : null,
    phase: validation.phase,
    nextPhase: nextPhase(validation.phase),
    completeness: { state: validation.complete ? "complete" : "incomplete", missing: validation.errors },
    unaddressed: unaddressedFields(json, validation.phase),
    ownerEdits: { state: d.alterations.length > 0 ? "pending" : "none", ...d.ownerEdits },
    alterations: d.alterations,
    lastVerify: lifecycle.lastVerify ?? null,
    phaseHistory: lifecycle.phaseHistory ?? [],
    lastBackwardMove: lastBackward(lifecycle.phaseHistory ?? []),
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

export async function advancePhase(
  ref: string,
  options: Location & { by?: Author; now?: string; to?: string; reason?: string } = {},
): Promise<PhaseResult> {
  const folder = await resolveFeature(ref, options);
  const current = await statusFolder(folder, options);
  const by = options.by ?? "agent";
  const backward = options.to !== undefined && options.to !== current.nextPhase;
  const target = options.to ?? current.nextPhase;
  const reasons: string[] = [];
  if (backward) {
    if (phaseIndex(target) < 0) reasons.push(`unknown phase "${target}"`);
    else if (phaseIndex(target) >= phaseIndex(current.phase)) reasons.push(`"${target}" is not an earlier phase than "${current.phase}"; only the next phase can be entered forward`);
    if (by !== "owner") reasons.push("a move back to an earlier phase is decided by the owner: pass by owner");
    if (!options.reason?.trim()) reasons.push("a move back to an earlier phase needs a reason, in French");
    if (current.ownerEdits.state === "pending") reasons.push(`${current.ownerEdits.hunks} owner edit(s) or alteration(s) pending: run the reconcile skill first`);
  } else {
    if (!target) reasons.push(`phase "${current.phase}" is the last one`);
    if (current.completeness.state !== "complete") {
      reasons.push(`phase "${current.phase}" is incomplete: ${current.completeness.missing.length} item(s) missing`);
      reasons.push(...current.completeness.missing.map((e) => `${e.pointer}: ${e.message}`));
    }
    if (current.ownerEdits.state === "pending") reasons.push(`${current.ownerEdits.hunks} owner edit(s) or alteration(s) pending: run the reconcile skill first`);
  }
  if (reasons.length > 0) {
    return { ok: false, feature: folder, from: current.phase, to: target, reasons, missing: current.completeness.missing, patch: null };
  }
  const now = options.now ?? new Date().toISOString();
  const entry = { phase: target, date: now, by, ...(backward ? { reason: options.reason!.trim() } : {}) };
  const result = await patchFolder(
    folder,
    [
      { op: "replace", path: "/phase", value: target },
      { op: "add", path: "/lifecycle/phaseHistory/-", value: entry },
    ],
    { ...options, allowProtected: true, now },
  );
  return {
    ok: result.ok,
    feature: folder,
    from: current.phase,
    to: target,
    reasons: result.ok ? [] : result.errors.map((e) => e.message),
    missing: result.validation?.errors ?? [],
    patch: result,
  };
}

export interface ReconcileInput {
  ops: PatchOperation[];
  applied: number;
  reported: { file: string; pointer: string | null; reason: string }[];
  featureChange?: { action: "accept" | "restore"; reason: string };
}

export interface ReconcileResult {
  ok: boolean;
  feature: string;
  pending: number;
  applied: number;
  reported: number;
  questions: string[];
  errors: string[];
  patch: PatchResult | null;
}

function questionOps(json: Record<string, unknown>, reported: ReconcileInput["reported"]): { ops: PatchOperation[]; ids: string[] } {
  if (reported.length === 0) return { ops: [], ids: [] };
  const framing = (json.framing ?? {}) as { questions?: { id?: string }[] };
  const existing = Array.isArray(framing.questions) ? framing.questions : [];
  let next = Math.max(0, ...existing.map((q) => Number(String(q.id ?? "").slice(2)) || 0)) + 1;
  const owners = [...indexIds(json)].map(([id, pointers]) => ({ id, pointer: pointers[0]! }));
  const ops: PatchOperation[] = existing.length === 0 && !Array.isArray(framing.questions) ? [{ op: "add", path: "/framing/questions", value: [] }] : [];
  const ids: string[] = [];
  for (const item of reported) {
    const id = `Q-${String(next++).padStart(2, "0")}`;
    const owner = item.pointer
      ? owners.filter((o) => item.pointer === o.pointer || item.pointer!.startsWith(`${o.pointer}/`)).sort((x, y) => y.pointer.length - x.pointer.length)[0]?.id
      : undefined;
    const where = item.pointer ? `${item.file}, ${item.pointer}` : item.file;
    ops.push({
      op: "add",
      path: "/framing/questions/-",
      value: { id, question: `Modification signalée (${where}) : ${item.reason}`, status: "open", ...(owner ? { about: [owner] } : {}) },
    });
    ids.push(id);
  }
  return { ops, ids };
}

export async function reconcile(ref: string, input: ReconcileInput, options: Location & { now?: string } = {}): Promise<ReconcileResult> {
  const folder = await resolveFeature(ref, options);
  const d = await diffFolder(folder, options);
  const pending = d.ownerEdits.hunks;
  const base = { feature: folder, pending, applied: input.applied, reported: input.reported.length, questions: [] as string[] };
  const refuse = (errors: string[]): ReconcileResult => ({ ...base, ok: false, errors, patch: null });
  const blocked = input.ops.filter((op) => touchesProtected(op.path) || touchesProtected(op.from));
  if (blocked.length > 0) return refuse(blocked.map((op) => `${op.path}: id, name, phase and lifecycle cannot be patched`));
  if (input.applied + input.reported.length !== pending) {
    return refuse([
      `${pending} pending hunk(s) or alteration(s), but applied (${input.applied}) + reported (${input.reported.length}) = ${input.applied + input.reported.length}; account for each one`,
    ]);
  }
  const now = options.now ?? new Date().toISOString();
  const file = featureFile(folder, options);
  const featureChanged = d.alterations.some((a) => a.kind === "feature-changed");
  const lifecycleOps: PatchOperation[] = [];
  if (featureChanged) {
    if (!input.featureChange) return refuse(["feature.json was changed outside the MCP: pass featureChange with action accept or restore, and a reason"]);
    let lastGood: Record<string, unknown>;
    try {
      lastGood = JSON.parse(await readFile(lastGoodPath(folder, options), "utf8")) as Record<string, unknown>;
    } catch {
      return refuse(["no last known good copy of feature.json under .spec-loop/: the change can only be accepted after fixing it by hand"]);
    }
    const handRaw = await readFile(file, "utf8");
    if (input.featureChange.action === "restore") {
      await backup(folder, "feature.json", handRaw, now, options);
      await writeFile(file, await readFile(lastGoodPath(folder, options), "utf8"));
    } else {
      let hand: Record<string, unknown>;
      try {
        hand = JSON.parse(handRaw) as Record<string, unknown>;
      } catch {
        return refuse(["feature.json is not valid JSON: it cannot be accepted, restore it"]);
      }
      const changed = PROTECTED.map((p) => p.slice(1)).filter((key) => JSON.stringify(hand[key]) !== JSON.stringify(lastGood[key]));
      if (changed.length > 0) return refuse([`${changed.join(", ")} changed by hand cannot be accepted: restore feature.json and use the phase tool`]);
      const accepted = (hand.lifecycle as { acceptedChanges?: unknown } | undefined)?.acceptedChanges;
      const value = { date: now, reason: input.featureChange.reason };
      lifecycleOps.push(Array.isArray(accepted) ? { op: "add", path: "/lifecycle/acceptedChanges/-", value } : { op: "add", path: "/lifecycle/acceptedChanges", value: [value] });
    }
  }
  const json = await loadFeature(folder, options);
  const questions = questionOps(json, input.reported);
  const lastVerify = { date: now, applied: input.applied, reported: input.reported };
  lifecycleOps.push(
    (json.lifecycle as { lastVerify?: unknown } | undefined)?.lastVerify
      ? { op: "replace", path: "/lifecycle/lastVerify", value: lastVerify }
      : { op: "add", path: "/lifecycle/lastVerify", value: lastVerify },
  );
  const result = await patchFolder(folder, [...input.ops, ...questions.ops, ...lifecycleOps], { ...options, force: true, allowProtected: true, now });
  return { ...base, questions: questions.ids, ok: result.ok, errors: result.errors.map((e) => `${e.pointer}: ${e.message}`), patch: result };
}
