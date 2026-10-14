# spec-loop: improvements after the first field run

Date: 14 October 2026. Source: the Gemini CLI run of spec-loop on a demo project (eight features, FEAT-001 to FEAT-008, packaged as the `software-factory` Gemini extension) and the owner's review of it.

This document is a brief for an agent that maintains a spec-loop extension or a fork. It states what the field run revealed, then specifies each improvement: the need, the contract, where it lives. The upstream repository is https://github.com/ng-galien/spec-loop (npm package `mcp-spec-loop`); these improvements are being implemented there, each in its own commit, in the order below. An extension built on spec-loop should take the new upstream version rather than re-implement; the contracts below are what to verify once it is in.

Everything in spec-loop is in English: keys, schema, templates, skills, docs, tool descriptions.

## What the field run revealed

1. **The agent ran a feature from framing to done in one turn**, without the owner. The gates of spec-loop are structural: the schema checks that the fields are there, not that the owner spoke. An agent that writes its own questions and answers passes every gate. The skills say to stop after each owner answer; the agent read them once at the start and never again, because no tool result points back to the method.
2. **New features were created while older ones were unfinished** (FEAT-003 stalled in verification while FEAT-007 and FEAT-008 advanced). Nothing in `create` looks at the other features.
3. **Scope leaked between features** (Markdown editor requirements injected into the feature reserved for the business-analyst gate). The refusal rule applies to owner edits, not to the agent's own patches, and the framing scope (`scope.in` / `scope.out`) is data nothing uses afterwards.
4. **Mermaid diagrams were sometimes broken** and nothing checked them before they were written and rendered.
5. **SVG screen wireframes were forgotten or wrong.** The `interfaceHasScreen` check exists but fires only when leaving requirements, only checks that an artifact entry exists, never looks at the file, and depends on the agent having set facet `interface`.
6. **Verification is declarative**: `tests[].status` is what the agent says; nothing carries evidence that a command ran.
7. The demo project had to put its own rules (independent review before verification, "run biome, vitest, playwright before claiming success") in its GEMINI.md, because spec-loop offers no way for a project to enrich the base loop.

What worked and must stay: the Gemini extension packaging (`gemini extensions link`) needed no help; the backward move `phase` with `to: "framing"` and a reason did what it is for; the MCP server stayed the only writer of `spec/`.

## Improvement 1: invariant "one feature at a time"

**Need.** A specification half done is not left behind to open the next one.

**Contract.**
- `create` refuses while any feature under `spec/` is not in the last phase (`done`). The error names the blocking feature, its phase and its missing count, for example: `FEAT-003 (verification, 10 items missing) is not done; finish it or ask the owner to open a new feature anyway`.
- Override by the owner only: `create` takes optional `by: "agent" | "owner"` (default `agent`) and `reason`. With `by: "owner"` and a non-empty reason the creation goes through and the reason is recorded in the new feature's lifecycle: `lifecycle.openedWhileUnfinished: { features: ["FEAT-003"], reason, date }` (a list: every feature not done at that moment). The lifecycle stays unpatchable.
- The `features` tool keeps listing every feature with phase, missing count, pending owner edits, alterations and last modification, so a stalled feature is visible.

**Where.** `src/lib/features.ts` (`create`), schema `lifecycle` definition, `create` input and output schemas in `src/mcp.ts`, the framing skill (it is the one that creates), `method/loop.md`, one line in `docs/decisions.md`.

## Improvement 2: instruction hooks, declared in the schema

**Need.** At every turn the agent must see what to do next, not only what is missing. The method must come back to it with every tool result.

**Contract.**
- Each entry of `x-phases` in `schema/feature.schema.json` carries `instructions: { onEnter, onIncomplete, beforeLeave }`: short imperative English sentences. They name the skill to run for the phase (`framing`, `requirements`, `acceptance`, `anchoring`, `verification`, `done`), say that the agent asks the owner one question at a time and stops after each answer, that it never calls `phase` forward without the owner's explicit confirmation in the conversation, and what to check before leaving the phase.
- Every tool result that concerns a feature (`create`, `status`, `patch`, `phase`, `reconcile`, and each entry of `features`) carries `next: { phase, skill, instruction, missing }`: `instruction` is `onEnter` right after a phase change, `onIncomplete` while the phase is incomplete, `beforeLeave` when the phase is complete; `missing` is the number of items still required.
- `learn` exposes the instructions in the `phases` topic.
- Every skill says once: "every tool result carries `next`: follow it".
- The instructions live only in the schema; nothing about phases is hard-coded in TypeScript.

**Where.** `schema/feature.schema.json` (`x-phases[].instructions`), `src/lib/lifecycle.ts` and `src/lib/features.ts` (compute `next`), Zod output schemas in `src/mcp.ts`, `src/lib/learn.ts` (phases topic), `skills-src/parts/preamble.md` then `npm run assemble`, `method/loop.md`, `docs/decisions.md`.

## Improvement 3: project hooks (commands and project instructions)

**Need.** A consuming project enriches the base loop declaratively: commands the MCP server runs in the project at a transition, and instructions of its own appended to the phase instructions. The project can only add to the base loop, never remove from it. This is how "independent review before verification" or "run the test runner before leaving verification" become part of the loop without editing spec-loop.

**Contract.**
- Optional file `spec/spec-loop.json` in the consuming project, validated by `schema/project.schema.json`:

  ```json
  {
    "hooks": [
      { "phase": "verification", "on": "beforeLeave", "run": "npx vitest run", "timeout": 120, "title": "Unit tests" },
      { "phase": "verification", "on": "beforeLeave", "run": "npx @biomejs/biome check .", "title": "Lint" },
      { "phase": "anchoring", "on": "onEnter", "run": "git status --porcelain", "title": "Clean tree" }
    ],
    "instructions": {
      "verification": { "onEnter": "Before writing tests, obtain an independent review of the code at the anchors against docs/agents/review-agents.md; record the verdict as a decision." }
    }
  }
  ```

- Project `instructions.<phase>.{onEnter, beforeLeave}` are appended to the schema instructions in `next.instruction`.
- `phase` requires `root`, an absolute path, as `create` does: the hooks run there. `create` runs the `onEnter` hooks of the first phase.
- Command hooks run with the project root as working directory, through the shell, with the timeout in seconds (default 120); stdout and stderr are captured and truncated to 4000 characters.
- `on: "beforeLeave"` hooks run inside `phase` before a forward move: any non-zero exit code blocks the move and the result says which hook failed and why; the move proceeds only when every hook passed.
- `on: "onEnter"` hooks run right after a successful move; a failure does not undo the move but is recorded.
- Every run is recorded in `lifecycle.hookRuns[]`: `{ phase, on, title, run, date, exitCode, durationMs, output }`. `status` reports the last run per hook. The `phase` result carries `hooks: [...]` with what ran. The runs are rendered as evidence in `verification.md` only, in a "Project hooks" table listing the runs of every phase; that document exists once the feature reaches verification, so runs of earlier phases appear there from then on. `lifecycle.hookRuns` keeps the last 10 runs of each hook.
- The commands come from the project's own file, which belongs to the user; spec-loop never fetches hooks from anywhere else. The docs say so.
- Documented in a `project` topic of `learn`, in the README ("Enrich the loop from your project") and in `examples/consumer/spec/spec-loop.json`.

**Where.** `schema/project.schema.json`, a `src/lib/hooks.ts` module, `src/lib/lifecycle.ts` (`advancePhase`), `src/mcp.ts`, `method/project.md`, `templates/tests.hbs` (evidence), `examples/consumer/`, `docs/decisions.md`.

## Improvement 4: Mermaid check at validation

**Need.** A broken diagram is never written into `feature.json`, so it is never rendered broken in the VS Code preview.

**Contract.**
- Every artifact with `format: "mermaid"` has its `source` parsed when the feature is validated. A parse failure is an `invalid` error (which blocks `patch`), with the pointer of the artifact and the parser's message.
- The parser works offline and deterministically and does not slow validation of features without Mermaid (lazy loading). It must cover the diagram kinds spec-loop renders: `flowchart`, `sequenceDiagram`, `stateDiagram-v2`, `classDiagram`, `erDiagram`. Candidate options: `@mermaid-js/parser` (Langium grammars, covers only some diagram types) or `mermaid`'s own `parse()` behind a minimal DOM (jsdom or happy-dom) in a lazily loaded module. The choice and what it does not cover go into `docs/decisions.md`.

**Where.** `src/lib/validate.ts`, a new `src/lib/mermaid.ts`, `test/validate.test.ts` (one valid and one broken flowchart), `docs/decisions.md`.

## Improvement 5: SVG check and the interface requirement

**Need.** When there is user interface, there is a screen wireframe in SVG, and the file is sound. The agent cannot forget it and cannot leave a broken file.

**Contract.**
- Validation of a stored feature (not of a bare candidate object) checks every artifact with `format: "svg"`: the file exists under the feature folder at `path`, is well-formed XML whose root element is `svg` in the SVG namespace, has a `viewBox` or `width` and `height`, contains no `script` element and no `on*` attribute. A failure is `invalid` with the artifact pointer. `validate`, `patch` and `phase` go through this.
- The check `interfaceHasScreen` (entry gate into acceptance) also fails when the referenced svg file is missing or invalid, not only when the artifact entry is absent. Its message names the requirement: `REQ-004 needs its screen wireframe`.
- The `requirements` skill and the `requirements` phase instructions say plainly: a requirement about anything the user sees or operates has facet `interface`; every interface requirement needs a screen wireframe in svg under `assets/` before the feature enters acceptance.
- During the requirements phase, a missing wireframe is visible in `next.missing` and in `status.missingForNext`, not only when the agent tries to leave the phase.

**Where.** `src/lib/validate.ts`, a new `src/lib/svg.ts`, `src/lib/lifecycle.ts` (`interfaceHasScreen`), `skills-src/requirements/body.md`, `schema/feature.schema.json` (requirements instructions), `test/validate.test.ts` with fixture svg files under `test/fixtures/`, `docs/decisions.md`.

## Improvement 6: leftovers of the English migration

Descriptions in `src/mcp.ts` still say "in French": the `create` title, the `phase` reason, `reconcile`'s `featureChange.reason`, `reportedItem.reason`; the server instructions still say "French Markdown"; `src/lib/lifecycle.ts` says "needs a reason, in French". Make them English or neutral. Nothing in the product is in French any more.

## Candidates not yet decided

These came out of the field run; they are recorded here so they are not lost. They are not being implemented now.

- **Requirements bound to the scope.** Each requirement references the `scope.in` item it serves; a requirement without a scope item is `incomplete`. This gives the agent's own patches a scope rule, as owner edits already have. A model change, to be weighed.
- **Owner decision on forward moves.** A forward `phase` move could require an owner decision text recorded in the lifecycle (as backward moves require a reason) and rendered in `decisions.md`. The instruction hooks already say that the owner confirms; recording the decision would make a speed-run visible and dated.
- **Evidence on tests.** Beyond hook runs, `tests[]` entries could carry `evidence: { command, date, exitCode }`.
- **Stale feature signal.** `features` could flag a feature with no change for a long time while another one advances.

## For the extension maintainer

- Take the upstream version once these commits are in; do not patch a copy.
- After updating, restart the MCP server (tool contracts changed: `create` gains `by`, `reason` and `hooks`; results gain `next`; `phase` gains `hooks` and requires an absolute `root`).
- Move the project rules that live in the demo's GEMINI.md (independent review, test commands) into `spec/spec-loop.json` of that project; keep GEMINI.md for what is not a loop rule.
- Verify on one feature: `create` refused while another is unfinished; `next.instruction` present in `status`; a broken `flowchart` refused by `patch`; an interface requirement without svg reported by `status` during requirements; a `beforeLeave` hook that exits 1 blocks `phase`.
