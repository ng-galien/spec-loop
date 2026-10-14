import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import formatsModule from "ajv-formats";
import { indexIds } from "./model.js";
import { activeChecks, checkRules, phaseIndex, phaseProducing, schema } from "./schema.js";
import type { Phase, ValidationError, ValidationResult } from "./types.js";

const addFormats = (formatsModule as unknown as { default: (ajv: Ajv2020) => Ajv2020 }).default;
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const check = ajv.compile(schema);

const COMPLETENESS_KEYWORDS = new Set(["required", "minItems", "minLength"]);
const EARS: Record<string, { test: RegExp; form: string }> = {
  ubiquitous: { test: /^The\b/i, form: "The <system> SHALL <response>" },
  event: { test: /^When\b/i, form: "When <trigger>, the <system> SHALL <response>" },
  state: { test: /^While\b/i, form: "While <precondition>, the <system> SHALL <response>" },
  unwanted: { test: /^If\b.*\bthen\b/i, form: "If <trigger>, then the <system> SHALL <response>" },
  optional: { test: /^Where\b/i, form: "Where <feature is included>, the <system> SHALL <response>" },
  complex: { test: /^While\b.*\bwhen\b/i, form: "While <precondition>, when <trigger>, the <system> SHALL <response>" },
};

type Rec = Record<string, unknown>;
const list = (value: unknown): Rec[] => (Array.isArray(value) ? (value as Rec[]) : []);
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

function phaseOf(json: unknown): Phase | null {
  const phase = (json as { phase?: unknown } | null)?.phase;
  return typeof phase === "string" && phaseIndex(phase) >= 0 ? phase : null;
}

function translate(error: ErrorObject, phase: Phase | null, reached: number): ValidationError | null {
  const where = phase ? ` in phase "${phase}"` : "";
  switch (error.keyword) {
    case "if":
    case "allOf":
    case "anyOf":
    case "not":
      return null;
    case "oneOf":
      return { pointer: error.instancePath, message: "formats mermaid and ascii take source, format svg takes path", kind: "invalid" };
    case "required": {
      const missing = (error.params as { missingProperty: string }).missingProperty;
      return { pointer: `${error.instancePath}/${missing}`, message: `missing: "${missing}" is required${where}`, kind: "incomplete" };
    }
    case "false schema": {
      const section = error.instancePath.split("/")[1] ?? "";
      const producer = phaseProducing(section);
      if (producer && phaseIndex(producer.name) <= reached) return null;
      return {
        pointer: error.instancePath,
        message: `"${section}" belongs to phase "${phaseProducing(section)?.name ?? section}" and is not allowed${where}; advance the phase first`,
        kind: "invalid",
      };
    }
    case "additionalProperties": {
      const extra = (error.params as { additionalProperty: string }).additionalProperty;
      return { pointer: `${error.instancePath}/${extra}`, message: `unknown property "${extra}"`, kind: "invalid" };
    }
    case "enum":
      return {
        pointer: error.instancePath,
        message: `must be one of ${(error.params as { allowedValues: unknown[] }).allowedValues.map((v) => JSON.stringify(v)).join(", ")}`,
        kind: "invalid",
      };
    case "pattern":
      if (/^\/requirements\/\d+\/statement$/.test(error.instancePath)) {
        return { pointer: error.instancePath, message: "a requirement statement is one EARS sentence whose response uses SHALL", kind: "invalid" };
      }
      if (/^\/tests\/\d+\/name$/.test(error.instancePath)) {
        return { pointer: error.instancePath, message: "a test name starts with the id of the criterion it verifies (AC-001.2)", kind: "invalid" };
      }
      return { pointer: error.instancePath, message: error.message ?? "pattern mismatch", kind: "invalid" };
    default:
      return {
        pointer: error.instancePath,
        message: error.message ?? error.keyword,
        kind: COMPLETENESS_KEYWORDS.has(error.keyword) ? "incomplete" : "invalid",
      };
  }
}

function coherence(json: Rec, phase: Phase | null, broken: Set<string> = new Set()): ValidationError[] {
  const errors: ValidationError[] = [];
  const invalid = (pointer: string, message: string) => errors.push({ pointer, message, kind: "invalid" });
  const incomplete = (pointer: string, message: string) => errors.push({ pointer, message, kind: "incomplete" });
  const index = indexIds(json);
  for (const [id, pointers] of index) {
    for (const pointer of pointers.slice(1)) invalid(`${pointer}/id`, `duplicate id ${id}, first used at ${pointers[0]}`);
  }
  const resolves = (ref: string) => ref.includes("/") || index.has(ref);
  const checkRefs = (items: Rec[], base: string, field: string) =>
    items.forEach((item, i) =>
      strings(item[field]).forEach((ref, j) => {
        if (/^([a-z0-9-]+\/)?[A-Z]+-\d/.test(ref) && !resolves(ref)) invalid(`${base}/${i}/${field}/${j}`, `references unknown id ${ref}`);
      }),
    );
  const framing = (json.framing ?? {}) as Rec;
  const questions = list(framing.questions);
  const requirements = list(json.requirements);
  const criteria = list(json.criteria);
  const anchors = list(json.anchors);
  const tests = list(json.tests);
  checkRefs(questions, "/framing/questions", "about");
  checkRefs(requirements, "/requirements", "source");
  checkRefs(anchors, "/anchors", "realizes");
  checkRefs(tests, "/tests", "verifies");
  checkRefs(list(json.decisions), "/decisions", "affects");
  checkRefs(list(json.artifacts), "/artifacts", "illustrates");
  requirements.forEach((req, i) => {
    const ears = EARS[String(req.pattern)];
    if (ears && typeof req.statement === "string" && !ears.test.test(req.statement.trim())) {
      invalid(`/requirements/${i}/statement`, `pattern "${String(req.pattern)}" expects the EARS form "${ears.form}"`);
    }
  });
  criteria.forEach((criterion, i) => {
    const id = String(criterion.id ?? "");
    const parent = String(criterion.requirement ?? "");
    if (!index.has(parent)) invalid(`/criteria/${i}/requirement`, `references unknown id ${parent}`);
    if (/^AC-\d{3}\./.test(id) && id.slice(3, 6) !== parent.slice(4, 7)) {
      invalid(`/criteria/${i}/id`, `${id} must carry the number of its requirement ${parent} (AC-${parent.slice(4, 7)}.n)`);
    }
  });
  const checks = activeChecks(phase);
  const matches = (item: Rec, filter: Record<string, unknown>) => Object.entries(filter).every(([key, value]) => item[key] === value);
  for (const name of checks) {
    const rule = checkRules[name];
    if (!rule?.requirement || !rule.artifact) continue;
    const artifacts = list(json.artifacts).filter((a) => matches(a, rule.artifact!));
    requirements.forEach((req, i) => {
      if (!matches(req, rule.requirement!)) return;
      const mine = artifacts.filter((a) => strings(a.illustrates).includes(String(req.id)));
      if (mine.some((a) => !broken.has(String(a.id)))) return;
      const message = (rule.message ?? `{id} breaks ${name}`).replace("{id}", String(req.id));
      incomplete(`/requirements/${i}`, mine.length ? `${message}: ${mine.map((a) => String(a.id)).join(", ")} is missing or invalid` : message);
    });
  }
  if (checks.has("noOpenQuestion")) {
    questions.forEach((q, i) => {
      if (q.status === "open") incomplete(`/framing/questions/${i}/status`, `question ${String(q.id)} is still open`);
    });
  }
  if (checks.has("requirementHasCriterion")) {
    requirements.forEach((req, i) => {
      if (!criteria.some((c) => c.requirement === req.id)) incomplete(`/requirements/${i}`, `missing: requirement ${String(req.id)} has no criterion`);
    });
  }
  if (checks.has("mustRequirementHasAnchor")) {
    requirements.forEach((req, i) => {
      if (req.priority === "MUST" && !anchors.some((a) => strings(a.realizes).includes(String(req.id)))) {
        incomplete(`/requirements/${i}`, `missing: MUST requirement ${String(req.id)} is realized by no anchor`);
      }
    });
  }
  if (checks.has("criterionHasTest")) {
    criteria.forEach((criterion, i) => {
      if (!tests.some((t) => strings(t.verifies).includes(String(criterion.id)))) incomplete(`/criteria/${i}`, `missing: criterion ${String(criterion.id)} is verified by no test`);
    });
  }
  if (checks.has("testNameCarriesCriterion")) {
    tests.forEach((test, i) => {
      const name = String(test.name ?? "");
      const verifies = strings(test.verifies);
      const snake = (ac: string) => `ac_${ac.slice(3).replace(".", "_")}`;
      const carries = (ac: string) => name.includes(ac) || name.toLowerCase().includes(snake(ac));
      for (const ac of verifies) if (!carries(ac)) invalid(`/tests/${i}/name`, `test name must contain ${ac}, which it verifies`);
      const lower = name.toLowerCase().replace(/^test_/, "");
      if (verifies.length > 0 && !verifies.some((ac) => name.startsWith(ac) || lower.startsWith(snake(ac)))) {
        invalid(`/tests/${i}/name`, `test name must start with the id of a criterion it verifies (${verifies[0]})`);
      }
    });
  }
  if (checks.has("testsPassingOrJustified")) {
    tests.forEach((test, i) => {
      const method = typeof test.method === "string" ? test.method : "test";
      if (method === "test" && test.status !== "passing") {
        incomplete(`/tests/${i}/status`, `missing: test "${String(test.name ?? "")}" is not passing`);
      }
    });
  }
  return errors;
}

export interface ValidateExtra {
  errors?: ValidationError[];
  brokenArtifacts?: Set<string>;
}

export function validate(json: unknown, extra: ValidateExtra = {}): ValidationResult {
  const phase = phaseOf(json);
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    return { valid: false, complete: false, phase, errors: [{ pointer: "", message: "a feature must be a JSON object", kind: "invalid" }] };
  }
  check(json);
  const errors: ValidationError[] = [];
  const seen = new Set<string>();
  const history = ((json as { lifecycle?: { phaseHistory?: { phase?: string }[] } }).lifecycle?.phaseHistory ?? []) as { phase?: string }[];
  const reached = Math.max(-1, ...(Array.isArray(history) ? history.map((h) => phaseIndex(h?.phase)) : []));
  for (const error of [...(check.errors ?? []).map((e) => translate(e, phase, reached)), ...coherence(json as Rec, phase, extra.brokenArtifacts), ...(extra.errors ?? [])]) {
    if (!error) continue;
    const key = `${error.pointer}\u0000${error.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    errors.push(error);
  }
  errors.sort((a, b) => (a.pointer < b.pointer ? -1 : a.pointer > b.pointer ? 1 : a.message < b.message ? -1 : 1));
  return { valid: !errors.some((e) => e.kind === "invalid"), complete: errors.length === 0, phase, errors };
}
