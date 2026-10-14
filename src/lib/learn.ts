import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { methodDir } from "./paths.js";
import { activeChecks, checkDescriptions, phases, resolveRef, schema, type JsonSchema } from "./schema.js";

const GENERATED = ["phases", "fields"];

export function topics(): string[] {
  const written = readdirSync(methodDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3));
  return [...new Set([...written, ...GENERATED])].sort();
}

function deref(node: JsonSchema): JsonSchema {
  let current = node;
  const merged: JsonSchema = { ...node };
  while (typeof current.$ref === "string") {
    current = resolveRef(current.$ref);
    for (const [k, v] of Object.entries(current)) if (!(k in merged) || k === "$ref") merged[k] = v;
  }
  delete merged.$ref;
  return merged;
}

function typeOf(node: JsonSchema): string {
  const n = deref(node);
  if (Array.isArray(n.enum)) return n.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (n.type === "array") return `array of ${typeOf((n.items ?? {}) as JsonSchema)}`;
  if (typeof n.pattern === "string" && n.type === "string") return `string matching ${n.pattern}`;
  if (Array.isArray(n.type)) return n.type.join(" | ");
  return String(n.type ?? (n.anyOf ? "id or text" : "value"));
}

function fieldLines(node: JsonSchema, prefix: string, depth = 0): string[] {
  const n = deref(node);
  const target = n.type === "array" ? deref((n.items ?? {}) as JsonSchema) : n;
  const props = (target.properties ?? {}) as Record<string, JsonSchema>;
  const required = new Set((target.required ?? []) as string[]);
  const out: string[] = [];
  for (const [key, child] of Object.entries(props)) {
    const c = deref(child);
    const examples = Array.isArray(c.examples) ? ` Example: \`${JSON.stringify(c.examples[0])}\`.` : "";
    out.push(`${"  ".repeat(depth)}- \`${prefix}${key}\` (${typeOf(child)}${required.has(key) ? ", required" : ""}): ${String(c.description ?? "")}${examples}`);
    for (const [value, text] of Object.entries((c["x-enumDescriptions"] ?? {}) as Record<string, string>)) {
      out.push(`${"  ".repeat(depth + 1)}- \`${value}\`: ${text}`);
    }
    const inner = c.type === "array" ? deref((c.items ?? {}) as JsonSchema) : c;
    if (inner.type === "object" && inner.properties && depth < 2) out.push(...fieldLines(c, "", depth + 1));
  }
  return out;
}

function requiredBy(phase: string): string[] {
  const out: string[] = [];
  for (const rule of (schema.allOf ?? []) as JsonSchema[]) {
    const cond = ((rule.if as JsonSchema)?.properties as JsonSchema)?.phase as JsonSchema | undefined;
    const applies = cond && (cond.const === phase || (Array.isArray(cond.enum) && cond.enum.includes(phase)));
    if (!applies) continue;
    const then = rule.then as JsonSchema;
    for (const key of (then.required ?? []) as string[]) {
      const min = ((then.properties as JsonSchema)?.[key] as JsonSchema | undefined)?.minItems;
      out.push(min ? `\`${key}\` with at least ${String(min)} item(s)` : `\`${key}\``);
    }
    for (const [key, value] of Object.entries((then.properties ?? {}) as JsonSchema)) {
      if (value === false) out.push(`no \`${key}\` yet (it belongs to a later phase)`);
    }
  }
  return out;
}

function phasesDoc(): string {
  const lines = [
    "# Phases",
    "",
    "Generated from the schema (`x-phases`, the `if/then` rules on `phase`, `x-checks`). Advance with the `phase` tool only, after the owner's explicit yes.",
    "",
    "Every tool result about a feature carries `next`: `phase`, `skill`, `instruction`, `missing` (count) and `todo` (each missing item as pointer: message). `instruction` is the phase's `onEnter` right after a phase change, `onIncomplete` while the phase is incomplete, `beforeLeave` once it is complete, or the `reconcile` skill while owner edits are pending. Follow it.",
    "",
    `Order: ${phases.map((p) => `\`${p.name}\``).join(" → ")}. Always required: ${((schema.required ?? []) as string[]).map((k) => `\`${k}\``).join(", ")}.`,
  ];
  phases.forEach((p, i) => {
    const inside = phases.slice(0, i + 1).flatMap((q) => q.checks).filter((c) => activeChecks(p.name).has(c));
    const next = phases[i + 1];
    const exit = next ? next.checks.filter((c) => activeChecks(p.name).has(c)) : [];
    const own = inside.filter((c) => !exit.includes(c));
    lines.push("", `## ${i + 1}. \`${p.name}\` (${p.title})`, "", p.description, "", `Skill: \`${p.skill}\`. Produces: ${p.produces.length ? p.produces.map((s) => `\`${s}\``).join(", ") : "nothing new"}. Granularity: ${p.granularity}`);
    lines.push("", "Instructions, carried by `next.instruction`:", `- on entering: ${p.instructions.onEnter}`, `- while incomplete: ${p.instructions.onIncomplete}`, `- before leaving: ${p.instructions.beforeLeave}`);
    const req = requiredBy(p.name);
    if (req.length) lines.push("", "Schema requires:", ...req.map((r) => `- ${r}`));
    if (own.length) lines.push("", "Coverage checks of this phase:", ...own.map((c) => `- ${checkDescriptions[c] ?? c}`));
    if (exit.length) lines.push("", `To satisfy before leaving (entry rules of \`${next!.name}\`, already checked here):`, ...exit.map((c) => `- ${checkDescriptions[c] ?? c}`));
    if (p.produces.length) lines.push("", `Fields: \`learn\` topic \`fields\`, section${p.produces.length > 1 ? "s" : ""} ${p.produces.map((s) => `\`${s}\``).join(", ")}.`);
  });
  return `${lines.join("\n")}\n`;
}

function fieldsDoc(): string {
  const props = schema.properties as Record<string, JsonSchema>;
  const lines = ["# Fields", "", "Generated from the schema descriptions and examples.", ""];
  for (const [key, node] of Object.entries(props)) {
    if (key === "$schema") continue;
    const n = deref(node);
    lines.push(`## \`${key}\``, "", String(n.description ?? ""), "");
    const nested = fieldLines(node, "");
    if (nested.length) lines.push(...nested, "");
  }
  return `${lines.join("\n")}\n`;
}

export function learn(topic = "index"): { topic: string; topics: string[]; content: string } {
  const all = topics();
  if (!all.includes(topic)) throw new Error(`unknown topic "${topic}"; topics: ${all.join(", ")}`);
  const content = topic === "phases" ? phasesDoc() : topic === "fields" ? fieldsDoc() : readFileSync(join(methodDir, `${topic}.md`), "utf8");
  return { topic, topics: all, content };
}
