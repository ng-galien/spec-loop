import { diffFolder } from "./diff.js";
import { loadFeature } from "./model.js";
import type { Location } from "./paths.js";
import { phaseInfo } from "./schema.js";
import type { NextStep, ValidationResult } from "./types.js";
import { validate } from "./validate.js";

export interface NextContext {
  entered?: boolean;
  pending?: boolean;
}

export function nextStep(validation: ValidationResult, context: NextContext = {}): NextStep {
  const info = phaseInfo(validation.phase);
  const todo = validation.errors.map((e) => `${e.pointer || "/"}: ${e.message}`);
  if (!info) {
    return { phase: null, skill: "reconcile", instruction: "feature.json names no known phase: run the `reconcile` skill and restore it.", missing: validation.errors.length, todo };
  }
  if (context.pending) {
    return {
      phase: info.name,
      skill: "reconcile",
      instruction: "Owner edits or alterations are pending: run the `reconcile` skill before anything else, then follow `next` again.",
      missing: validation.errors.length,
      todo,
    };
  }
  const moment = context.entered ? "onEnter" : validation.complete ? "beforeLeave" : "onIncomplete";
  return { phase: info.name, skill: info.skill, instruction: info.instructions[moment], missing: validation.errors.length, todo };
}

export async function nextFor(folder: string, options: Location = {}, context: { entered?: boolean } = {}): Promise<NextStep> {
  const json = await loadFeature(folder, options);
  const d = await diffFolder(folder, options);
  return nextStep(validate(json), { ...context, pending: d.alterations.length > 0 });
}
