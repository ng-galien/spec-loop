import { mkdtemp, mkdir, copyFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Feature } from "../src/lib/index.js";

export const FEATURE = "FEAT-001";
export const FOLDER = "FEAT-001-maket-http-connector";
const fixture = (name: string) => resolve(import.meta.dirname, "fixtures", `${name}.json`);

export async function workspace(name: "framing" | "requirements" = "framing"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "spec-loop-test-"));
  await mkdir(join(root, "spec", FOLDER), { recursive: true });
  await copyFile(fixture(name), join(root, "spec", FOLDER, "feature.json"));
  return root;
}

export const inFolder = (root: string, ...parts: string[]) => join(root, "spec", FOLDER, ...parts);

export async function guineaPig(): Promise<Feature> {
  return JSON.parse(await readFile(fixture("framing"), "utf8")) as Feature;
}

export async function requirementsFixture(): Promise<Feature> {
  return JSON.parse(await readFile(fixture("requirements"), "utf8")) as Feature;
}

export function inRequirements(feature: Feature): Feature {
  const copy = structuredClone(feature) as Feature & { framing: { questions: { status: string; answer?: string }[] } };
  copy.framing.questions.forEach((q) => {
    q.status = "answered";
    q.answer = "Recommandation retenue.";
  });
  copy.phase = "requirements";
  copy.requirements = [
    {
      id: "REQ-001",
      pattern: "event",
      facet: "integration",
      statement: "When the agent lists a workspace, the connector SHALL follow the API cursor until the requested page is filled.",
      priority: "MUST",
      rationale: "Le listage par curseur est la base d'ItemSource.",
      source: ["ACT-02"],
    },
    {
      id: "REQ-002",
      pattern: "unwanted",
      facet: "behaviour",
      statement: "If the API answers 412 to a PUT, then the connector SHALL report a stale revision to the agent.",
      priority: "MUST",
      rationale: "Aucun écrasement à l'aveugle.",
      source: ["CON-03"],
    },
  ];
  return copy;
}
export function inAcceptance(feature: Feature): Feature {
  const copy = inRequirements(feature);
  copy.phase = "acceptance";
  copy.criteria = [
    { id: "AC-001.1", requirement: "REQ-001", title: "deux pages", given: ["une API qui renvoie deux pages"], when: "l'agent liste l'espace", then: ["les éléments des deux pages sont listés"] },
    { id: "AC-002.1", requirement: "REQ-002", title: "révision périmée", given: ["un élément de révision 3", "l'API est à la révision 4"], when: "l'agent écrit l'élément", then: ["l'agent reçoit une révision périmée"] },
  ];
  return copy;
}
