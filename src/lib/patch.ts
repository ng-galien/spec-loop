import { readFile, writeFile } from "node:fs/promises";
import fastJsonPatch from "fast-json-patch";
import { resolveFeature, serializeFeature } from "./model.js";
import { featureFile, type Location } from "./paths.js";
import { ownerEditedFiles, render, renderToMemory } from "./render.js";
import { nextFor } from "./next.js";
import type { Feature, NextStep, PatchOperation, PatchResult, ValidationError } from "./types.js";
import { validateFeature } from "./artifacts.js";

const { applyPatch, deepClone } = fastJsonPatch;

export const PROTECTED = ["/id", "/name", "/phase", "/lifecycle"];

export interface PatchOptions extends Location {
  force?: boolean;
  now?: string;
  allowProtected?: boolean;
}

export const touchesProtected = (path: string | undefined) => path !== undefined && (path === "" || PROTECTED.some((p) => path === p || path.startsWith(`${p}/`)));

export function protectedChanges(before: Record<string, unknown>, after: unknown): string[] {
  const next = (after !== null && typeof after === "object" && !Array.isArray(after) ? after : {}) as Record<string, unknown>;
  return PROTECTED.map((p) => p.slice(1)).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(next[key]));
}

const PROTECTED_MESSAGE = "id, name, phase and lifecycle are written by the create, phase and reconcile tools only";

export async function patchFolder(folder: string, ops: PatchOperation[], options: PatchOptions = {}): Promise<PatchResult> {
  const file = featureFile(folder, options);
  const current = JSON.parse(await readFile(file, "utf8")) as Feature;
  const fail = (errors: ValidationError[], validation: PatchResult["validation"] = null): PatchResult => ({ ok: false, feature: folder, errors, validation, render: null });
  if (!options.allowProtected) {
    const blocked = ops.filter((op) => touchesProtected(op.path) || touchesProtected(op.from));
    if (blocked.length > 0) {
      return fail(blocked.map((op) => ({ pointer: op.path, message: PROTECTED_MESSAGE, kind: "invalid" as const })));
    }
  }
  let next: Feature;
  try {
    next = applyPatch(deepClone(current), ops as never, true, false).newDocument as Feature;
  } catch (error) {
    const e = error as { message?: string; index?: number; operation?: { path?: string } };
    return fail([{ pointer: e.operation?.path ?? "", message: `patch operation ${e.index ?? "?"} rejected: ${(e.message ?? String(error)).split("\n")[0]}`, kind: "invalid" }]);
  }
  if (!options.allowProtected) {
    const changed = protectedChanges(current, next);
    if (changed.length > 0) return fail(changed.map((key) => ({ pointer: `/${key}`, message: `${PROTECTED_MESSAGE}; this patch changes ${key}`, kind: "invalid" as const })));
  }
  const validation = await validateFeature(next, { folder, options });
  if (!validation.valid) return fail(validation.errors.filter((e) => e.kind === "invalid"), validation);
  if (!options.force) {
    const edited = await ownerEditedFiles(folder, renderToMemory(next, validation), next, options);
    if (edited.length > 0) {
      return fail(
        edited.map((path) => ({ pointer: "", message: `${path} was changed outside the MCP and is not reconciled yet: run the reconcile skill first`, kind: "invalid" as const })),
        validation,
      );
    }
  }
  await writeFile(file, serializeFeature(next));
  const rendered = await render(folder, { ...options, force: options.force ?? false, trustedFeature: true });
  return { ok: rendered.ok, feature: folder, errors: [], validation, render: rendered };
}

export async function patch(ref: string, ops: PatchOperation[], options: PatchOptions = {}): Promise<PatchResult & { next: NextStep }> {
  const folder = await resolveFeature(ref, options);
  const result = await patchFolder(folder, ops, options);
  return { ...result, next: await nextFor(folder, options) };
}
