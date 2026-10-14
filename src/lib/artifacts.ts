import type { Location } from "./paths.js";
import type { ValidationError, ValidationResult } from "./types.js";
import { validate } from "./validate.js";

type Rec = Record<string, unknown>;

export interface Stored {
  folder: string;
  options: Location;
}

export async function artifactErrors(json: unknown, _stored?: Stored): Promise<{ errors: ValidationError[]; broken: Set<string> }> {
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
  }
  return { errors, broken };
}

export async function validateFeature(json: unknown, stored?: Stored): Promise<ValidationResult> {
  const { errors, broken } = await artifactErrors(json, stored);
  return validate(json, { errors, brokenArtifacts: broken });
}
