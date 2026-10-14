#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const major = Number(process.versions.node.split(".")[0]);
if (major < 22) {
  process.stderr.write(`spec-loop needs Node 22 or later; this is Node ${process.versions.node}\n`);
  process.exit(1);
}

const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
const z = await import("zod");
const lib = await import("./lib/index.js");
const { packageRoot } = await import("./lib/paths.js");

const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as { version: string };
const phaseNames = lib.phases.map((p) => p.name) as [string, ...string[]];

const feature = z.string().min(1).describe("spec-loop feature: its id (FEAT-001), its name (maket-http-connector) or its folder");
const root = z
  .string()
  .optional()
  .describe("Absolute path of the project holding spec/. Pass it on every call; otherwise SPEC_LOOP_ROOT, then CLAUDE_PROJECT_DIR, then the server working directory.");

const validationError = z.object({
  pointer: z.string().describe("JSON pointer (RFC 6901) into feature.json"),
  message: z.string(),
  kind: z.enum(["incomplete", "invalid"]).describe("incomplete: missing for the current phase; invalid: wrong shape, mixed phases, duplicate or dangling id"),
});
const validation = z.object({
  valid: z.boolean().describe("No invalid error: the JSON may be written"),
  complete: z.boolean().describe("No error at all: the current phase is complete"),
  phase: z.enum(phaseNames).nullable(),
  errors: z.array(validationError),
});
const renderResult = z.object({
  ok: z.boolean(),
  feature: z.string(),
  files: z.array(z.object({ path: z.string(), source: z.string(), template: z.string(), changed: z.boolean() })),
  removed: z.array(z.string()),
  backedUp: z.array(z.string()).describe("Owner-edited files saved under .spec-loop/overwritten/ before they were overwritten"),
  refused: z.array(z.string()).describe("Files or assets holding unverified owner edits; non-empty means nothing was written"),
  validation,
});
const target = z.object({ id: z.string().nullable(), pointer: z.string().nullable() });
const alteration = z.object({
  kind: z.enum(["rendered-changed", "asset-changed", "feature-changed", "rendered-missing", "rendered-extra"]),
  path: z.string().describe("Path relative to the feature folder"),
  ids: z.array(z.string()).describe("Ids the alteration touches"),
  message: z.string(),
  hunks: z.number().optional(),
  errors: z.array(validationError).optional().describe("Schema errors of a feature.json changed outside the MCP"),
});
const ownerEdits = z.object({ files: z.number(), hunks: z.number().describe("Pending items to account for in reconcile"), ids: z.array(z.string()) });
const diffResult = z.object({
  feature: z.string(),
  clean: z.boolean(),
  ownerEdits,
  alterations: z.array(alteration),
  files: z.array(
    z.object({
      path: z.string(),
      artifact: z.string().nullable().describe("ART id when the file is an svg asset"),
      review: z.string().nullable().describe("Set for an asset: review it visually, it is never reconciled automatically"),
      source: z.string().nullable(),
      template: z.string().nullable(),
      status: z.enum(["unchanged", "modified", "missing", "unexpected"]),
      editedByOwner: z.boolean().nullable().describe("true: differs from what the MCP last wrote; false: only stale against feature.json"),
      hunks: z.array(
        z.object({
          oldStart: z.number(),
          oldLines: z.number(),
          newStart: z.number(),
          newLines: z.number(),
          lines: z.array(z.string()).describe("Unified diff lines: '-' regenerated projection, '+' file on disk"),
          target: target.describe("Nearest enclosing block id and its JSON pointer"),
          touches: z.array(target),
          addedIds: z.array(z.string()),
          removedIds: z.array(z.string()),
          newIds: z.array(z.string()).describe("Ids written by the owner that do not exist in feature.json"),
        }),
      ),
    }),
  ),
});
const nextStep = z
  .object({
    phase: z.string().nullable().describe("Current phase of the feature"),
    skill: z.string().nullable().describe("The skill to run now"),
    instruction: z.string().describe("What to do now: follow it. Taken from the schema (onEnter right after a phase change, onIncomplete while the phase is incomplete, beforeLeave once it is complete)"),
    missing: z.number().describe("Number of items still missing or invalid in the current phase, entry rules of the next phase included"),
    todo: z.array(z.string()).describe("Each missing or invalid item as pointer: message"),
  })
  .describe("What the agent does next: every result about a feature carries it; follow it");
const hookRun = z.object({
  phase: z.string(),
  on: z.enum(["beforeLeave", "onEnter"]),
  title: z.string(),
  run: z.string().describe("Shell command, run from the project root"),
  date: z.string(),
  exitCode: z.number().nullable().describe("null when stopped by its timeout or not started"),
  durationMs: z.number(),
  output: z.string().describe("stdout and stderr, cut to their last 4000 characters"),
});
const patchResult = z.object({ ok: z.boolean(), feature: z.string(), errors: z.array(validationError), validation: validation.nullable(), render: renderResult.nullable() });
const operation = z.object({ op: z.enum(["add", "remove", "replace", "move", "copy", "test"]), path: z.string(), value: z.unknown().optional(), from: z.string().optional() });
const reportedItem = z.object({ file: z.string(), pointer: z.string().nullable(), reason: z.string().describe("Why it is reported to the owner instead of applied, in French") });
const history = z.object({ phase: z.string(), date: z.string(), by: z.enum(["agent", "owner"]), reason: z.string().optional() });

const server = new McpServer(
  { name: "spec-loop", version: pkg.version },
  {
    instructions:
      "spec-loop keeps one JSON object per feature in spec/<FEAT-nnn-name>/feature.json and projects it into French Markdown for the owner. This server is the only writer of spec/: never edit those files with a file tool. Pass root (the absolute project path) on every call. Start with learn, then status or features. Every result about a feature carries next (phase, skill, instruction, missing, todo): follow next.instruction, run the skill it names, ask the owner one question at a time, and never call phase forward without the owner's explicit yes in the conversation.",
  },
);

type Shape = Record<string, unknown>;
function reply(result: object, isError = false) {
  return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }], structuredContent: result as Shape, isError };
}
function failure(error: unknown) {
  return { content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }], isError: true };
}
async function run(fn: () => Promise<{ value: object; isError?: boolean }>) {
  try {
    const { value, isError } = await fn();
    return reply(value, isError ?? false);
  } catch (error) {
    return failure(error);
  }
}
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const writes = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

server.registerTool(
  "learn",
  {
    title: "Learn the spec-loop method",
    description: `Return one topic of the spec-loop method; phases and fields are generated from the schema. Topics: ${lib.topics().join(", ")}.`,
    inputSchema: { topic: z.enum(lib.topics() as [string, ...string[]]).optional().describe("Defaults to index") },
    outputSchema: { topic: z.string(), topics: z.array(z.string()), content: z.string() },
    annotations: readOnly,
  },
  async ({ topic }) => run(async () => ({ value: lib.learn(topic) })),
);

server.registerTool(
  "features",
  {
    title: "List spec-loop features",
    description: "One summary line per spec-loop feature under spec/: id, name, phase, completeness, pending owner edits or alterations, last modification; echoes the resolved root and spec path.",
    inputSchema: { root },
    outputSchema: {
      root: z.string().describe("Resolved project root"),
      spec: z.string().describe("Resolved spec/ folder"),
      features: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          folder: z.string(),
          path: z.string().describe("Absolute path of feature.json"),
          corrupted: z.string().nullable().describe("Parse error when feature.json is not readable JSON"),
          title: z.string().nullable(),
          phase: z.string().nullable(),
          complete: z.boolean(),
          missingCount: z.number(),
          missingForNext: z.array(validationError),
          ownerEdits: z.enum(["none", "pending"]),
          alterations: z.number(),
          modified: z.string(),
          next: nextStep,
        }),
      ),
    },
    annotations: readOnly,
  },
  async ({ root }) => run(async () => ({ value: await lib.featuresReport({ root }) })),
);

server.registerTool(
  "status",
  {
    title: "Status of a spec-loop feature",
    description: "Phase, completeness (recomputed by validate), pending owner edits and alterations (recomputed by diff against the manifest), last reconciliation and phase history of one spec-loop feature.",
    inputSchema: { feature, root },
    outputSchema: {
      root: z.string().describe("Resolved project root"),
      spec: z.string().describe("Resolved spec/ folder"),
      file: z.string().describe("Absolute path of feature.json"),
      id: z.string(),
      name: z.string(),
      folder: z.string(),
      title: z.string().nullable(),
      phase: z.string().nullable(),
      nextPhase: z.string().nullable(),
      completeness: z.object({ state: z.enum(["complete", "incomplete"]), missing: z.array(validationError) }),
      unaddressed: z
        .array(z.object({ pointer: z.string(), description: z.string() }))
        .describe("Fields of the current phase never set, optional ones included; a field set to an empty array counts as addressed"),
      ownerEdits: z.object({ state: z.enum(["none", "pending"]), files: z.number(), hunks: z.number(), ids: z.array(z.string()) }),
      alterations: z.array(alteration),
      lastVerify: z.object({ date: z.string(), applied: z.number(), reported: z.array(reportedItem) }).nullable(),
      phaseHistory: z.array(history),
      lastBackwardMove: z
        .object({ from: z.string(), to: z.string(), date: z.string(), by: z.enum(["agent", "owner"]), reason: z.string() })
        .nullable()
        .describe("The last move back to an earlier phase, with the owner's reason"),
      hooks: z
        .array(
          z.object({
            phase: z.string(),
            on: z.enum(["beforeLeave", "onEnter"]),
            title: z.string(),
            run: z.string(),
            lastRun: z.object({ date: z.string(), exitCode: z.number().nullable(), durationMs: z.number() }).nullable(),
          }),
        )
        .describe("Project hooks declared in spec/spec-loop.json, each with its last run on this feature"),
      next: nextStep,
    },
    annotations: readOnly,
  },
  async ({ feature, root }) => run(async () => ({ value: await lib.status(feature, { root }) })),
);

server.registerTool(
  "create",
  {
    title: "Create a spec-loop feature",
    description:
      "Write the skeleton of a new spec-loop feature (next FEAT number, first phase), render it and refresh spec/README.md. One feature at a time: refuses while another feature is not done, naming it, unless the owner asked for it explicitly (by owner with a reason, recorded in the new feature's lifecycle).",
    inputSchema: {
      name: z.string().describe("Kebab-case name, e.g. maket-http-connector"),
      title: z.string().min(1).describe("Title for the owner"),
      by: z.enum(["agent", "owner"]).optional().describe("Who decided the creation; defaults to agent. Pass owner only when the owner explicitly asked to open this feature while another one is not done"),
      reason: z.string().optional().describe("The owner's reason for opening a feature while another one is not done; required with by owner in that case"),
      root: z.string().describe("Absolute path of the project that holds or will hold spec/; required"),
    },
    outputSchema: { ok: z.boolean(), feature: z.string().nullable(), id: z.string().nullable(), errors: z.array(validationError), render: renderResult.nullable(), next: nextStep.nullable() },
    annotations: writes,
  },
  async ({ name, title, by, reason, root }) =>
    run(async () => {
      const value = await lib.create(name, title, { root, by, reason });
      return { value, isError: !value.ok };
    }),
);

server.registerTool(
  "validate",
  {
    title: "Validate a spec-loop feature",
    description: "Validate a spec-loop feature.json, or a candidate object, against the schema and the coverage checks of its phase, and parse every Mermaid artifact; every error has a JSON pointer.",
    inputSchema: { feature: feature.optional(), json: z.record(z.string(), z.unknown()).optional().describe("Candidate feature object, validated instead of the stored file"), root },
    outputSchema: validation.shape,
    annotations: readOnly,
  },
  async ({ feature, json, root }) =>
    run(async () => {
      if (json) return { value: await lib.validateFeature(json) };
      if (!feature) throw new Error("give either feature or json");
      const folder = await lib.resolveFeature(feature, { root });
      return { value: await lib.validateFeature(await lib.loadFeature(folder, { root }), { folder, options: { root } }) };
    }),
);

server.registerTool(
  "render",
  {
    title: "Render a spec-loop feature",
    description: "Project a spec-loop feature.json into its rendered/ folder (deterministic) and refresh the manifest and spec/README.md. Refuses while owner edits are unverified.",
    inputSchema: { feature, root },
    outputSchema: renderResult.shape,
    annotations: { ...writes, idempotentHint: true },
  },
  async ({ feature, root }) =>
    run(async () => {
      const value = await lib.render(feature, { root });
      return { value, isError: !value.ok };
    }),
);

server.registerTool(
  "diff",
  {
    title: "Diff a spec-loop projection",
    description: "Compare the regenerated projection of a spec-loop feature with the files on disk and the manifest; each hunk carries its block id and JSON pointer, and every alteration is classified.",
    inputSchema: { feature, root },
    outputSchema: diffResult.shape,
    annotations: readOnly,
  },
  async ({ feature, root }) => run(async () => ({ value: await lib.diff(feature, { root }) })),
);

server.registerTool(
  "patch",
  {
    title: "Patch a spec-loop feature",
    description: "Apply an RFC 6902 JSON Patch to a spec-loop feature.json, validate, write only when no invalid error remains, then re-render. id, name, phase and lifecycle are not patchable.",
    inputSchema: { feature, ops: z.array(operation).min(1), root },
    outputSchema: { ...patchResult.shape, next: nextStep },
    annotations: writes,
  },
  async ({ feature, ops, root }) =>
    run(async () => {
      const value = await lib.patch(feature, ops as never, { root });
      return { value, isError: !value.ok };
    }),
);

server.registerTool(
  "phase",
  {
    title: "Advance a spec-loop feature",
    description:
      "Move a spec-loop feature to the next phase of the schema, only when the current phase is complete (entry rules of the next phase included), no owner edit is pending and every beforeLeave project hook of spec/spec-loop.json exits 0; or, with to, back to an earlier phase on the owner's decision with a reason. Runs the onEnter project hooks of the phase entered, records the history entry and every hook run.",
    inputSchema: {
      feature,
      by: z.enum(["agent", "owner"]).describe("Who decided the move: owner when the owner asked for it; a backward move requires owner"),
      to: z.string().optional().describe("An earlier phase to move back to; omit to advance to the next phase"),
      reason: z.string().optional().describe("Why the owner moves the feature back, in French; required with to"),
      root,
    },
    outputSchema: { ok: z.boolean(), feature: z.string(), from: z.string().nullable(), to: z.string().nullable(), reasons: z.array(z.string()), missing: z.array(validationError), hooks: z.array(hookRun).describe("Project hooks run by this call: beforeLeave hooks of the phase left, then onEnter hooks of the phase entered"), patch: patchResult.nullable(), next: nextStep },
    annotations: writes,
  },
  async ({ feature, by, to, reason, root }) =>
    run(async () => {
      const value = await lib.advancePhase(feature, { root, by, to, reason });
      return { value, isError: !value.ok };
    }),
);

server.registerTool(
  "reconcile",
  {
    title: "Reconcile owner edits of a spec-loop feature",
    description: "Close a reconciliation of the owner edits of a spec-loop feature: apply the JSON Patch for the coherent owner edits, turn each reported one into an open question, restore the projection exactly (owner files kept in .spec-loop/overwritten/<time>/) and record lastVerify. applied + reported must equal the pending count from diff.",
    inputSchema: {
      feature,
      ops: z.array(operation).describe("JSON Patch for the coherent edits; may be empty"),
      applied: z.number().int().min(0).describe("Number of pending items brought into the JSON or accepted"),
      reported: z.array(reportedItem).describe("Pending items reported to the owner instead of applied; each becomes an open question in framing.questions"),
      featureChange: z
        .object({ action: z.enum(["accept", "restore"]), reason: z.string().min(1).describe("In French") })
        .optional()
        .describe("Required when feature.json was changed outside the MCP: accept it (recorded in lifecycle.acceptedChanges) or restore the last known good copy"),
      root,
    },
    outputSchema: {
      ok: z.boolean(),
      feature: z.string(),
      pending: z.number(),
      applied: z.number(),
      reported: z.number(),
      questions: z.array(z.string()).describe("Ids of the open questions created for the reported items"),
      errors: z.array(z.string()),
      patch: patchResult.nullable(),
      next: nextStep,
    },
    annotations: writes,
  },
  async ({ feature, ops, applied, reported, featureChange, root }) =>
    run(async () => {
      const value = await lib.reconcile(feature, { ops: ops as never, applied, reported, featureChange }, { root });
      return { value, isError: !value.ok };
    }),
);

await server.connect(new StdioServerTransport());
