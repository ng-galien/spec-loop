import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { featureDir, type Location } from "./paths.js";
import { svgProblem } from "./svg.js";
import type { ValidationError, ValidationResult } from "./types.js";
import { validate } from "./validate.js";

type Rec = Record<string, unknown>;

export interface Stored {
  folder: string;
  options: Location;
}

async function svgError(path: string, stored: Stored): Promise<string | null> {
  const dir = featureDir(stored.folder, stored.options);
  const file = resolve(dir, path);
  if (!file.startsWith(`${dir}${sep}`)) return `${path} is outside the feature folder`;
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    return `${path} does not exist in spec/${stored.folder}/; write the file before declaring it`;
  }
  const problem = svgProblem(text);
  return problem ? `${path} ${problem}` : null;
}

export async function artifactErrors(json: unknown, stored?: Stored): Promise<{ errors: ValidationError[]; broken: Set<string> }> {
  const errors: ValidationError[] = [];
  const broken = new Set<string>();
  const artifacts = json !== null && typeof json === "object" && Array.isArray((json as Rec).artifacts) ? ((json as Rec).artifacts as Rec[]) : [];
  for (const [i, artifact] of artifacts.entries()) {
    if (artifact === null || typeof artifact !== "object") continue;
    if (artifact.format === "mermaid" && typeof artifact.source === "string" && artifact.source.trim() !== "") {
      const { mermaidError } = await import("./mermaid.js");
      const error = await mermaidError(artifact.source);
      if (error) {
        errors.push({ pointer: `/artifacts/${i}`, message: `${String(artifact.id ?? "artifact")}: the Mermaid source does not parse: ${error}`, kind: "invalid" });
        broken.add(String(artifact.id));
      }
    }
    if (stored && artifact.format === "svg" && typeof artifact.path === "string") {
      const error = await svgError(artifact.path, stored);
      if (error) {
        errors.push({ pointer: `/artifacts/${i}`, message: `${String(artifact.id ?? "artifact")}: ${error}`, kind: "invalid" });
        broken.add(String(artifact.id));
      }
    }
  }
  return { errors, broken };
}

export async function validateFeature(json: unknown, stored?: Stored): Promise<ValidationResult> {
  const { errors, broken } = await artifactErrors(json, stored);
  return validate(json, { errors, brokenArtifacts: broken });
}
