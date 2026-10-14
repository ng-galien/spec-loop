export type Phase = string;

export type Feature = Record<string, unknown> & { phase?: Phase };

export interface ValidationError {
  pointer: string;
  message: string;
  kind: "incomplete" | "invalid";
}

export interface ValidationResult {
  valid: boolean;
  complete: boolean;
  phase: Phase | null;
  errors: ValidationError[];
}

export interface RenderedFile {
  path: string;
  source: string;
  template: string;
  content: string;
}

export interface RenderResult {
  ok: boolean;
  feature: string;
  files: { path: string; source: string; template: string; changed: boolean }[];
  removed: string[];
  backedUp: string[];
  refused: string[];
  validation: ValidationResult;
}

export interface Target {
  id: string | null;
  pointer: string | null;
}

export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
  target: Target;
  touches: Target[];
  addedIds: string[];
  removedIds: string[];
  newIds: string[];
}

export interface FileDiff {
  path: string;
  artifact: string | null;
  review: string | null;
  source: string | null;
  template: string | null;
  status: "unchanged" | "modified" | "missing" | "unexpected";

  editedByOwner: boolean | null;
  hunks: Hunk[];
}

export interface Alteration {
  kind: "rendered-changed" | "asset-changed" | "feature-changed" | "rendered-missing" | "rendered-extra";
  path: string;
  ids: string[];
  message: string;
  hunks?: number;
  errors?: ValidationError[];
}

export interface DiffResult {
  feature: string;
  clean: boolean;
  ownerEdits: { files: number; hunks: number; ids: string[] };
  alterations: Alteration[];
  files: FileDiff[];
}

export interface PatchOperation {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: unknown;
  from?: string;
}

export interface NextStep {
  phase: string | null;
  skill: string | null;
  instruction: string;
  missing: number;
  todo: string[];
}

export interface PatchResult {
  ok: boolean;
  feature: string;
  errors: ValidationError[];
  validation: ValidationResult | null;
  render: RenderResult | null;
}
