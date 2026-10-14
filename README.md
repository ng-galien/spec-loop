# spec-loop

spec-loop is for a product owner who works with a coding agent and wants to decide what gets built without writing specifications by hand. The agent keeps one JSON model per feature. A JSON Schema governs which fields each phase requires and when a phase may close. The model is rendered as Markdown documents that the owner reads in the VS Code preview. The owner answers in the chat, or edits the documents directly and asks the agent to take the edits into account. The agent maps each edit back to the object it changes and applies it. It reports, and does not apply, any edit that widens the scope or contradicts the model. Everything goes through one MCP server, so it works the same with Gemini CLI, Claude Code and Codex. spec-loop specifies; it does not implement: the code is written at the anchors, between the anchoring and verification phases, with the agent's usual development workflow.

Project page: [site/index.html](site/index.html), with the brand in [assets/brand/](assets/brand/brand.md).

```mermaid
flowchart LR
  owner["Owner, in VS Code"]
  agent["Agent: Gemini CLI, Claude Code or Codex"]
  mcp["spec-loop MCP server"]
  schema["feature.schema.json"]
  json[("feature.json")]
  md["rendered/*.md"]
  owner -- "answers and decisions in the chat" --> agent
  agent -- "create, patch, phase, reconcile" --> mcp
  mcp -- "validates against" --> schema
  mcp -- "writes" --> json
  json -- "rendered by Handlebars" --> md
  md -- "read in the preview" --> owner
  owner -. "edits a rendered file" .-> md
  md -. "diff maps each hunk to an id and a JSON pointer" .-> mcp
  mcp -. "reconcile patches coherent edits, reports the others" .-> json
```

A feature goes through six phases. Each phase adds one kind of object and is left only when the schema says it is complete:

```mermaid
flowchart TB
  framing["framing: intent, actors, scope in and out, constraints, assumptions, questions, glossary"]
  requirements["requirements: one EARS sentence per behaviour, with facet and priority; svg wireframe for each interface requirement"]
  acceptance["acceptance: Given/When/Then criteria, at least one per requirement"]
  anchoring["anchoring: file and symbol that will realise each requirement"]
  verification["verification: one declared test per criterion, status from the test runner"]
  done["done: every test passing or justified, no open question"]
  framing --> requirements --> acceptance --> anchoring --> verification --> done
```

## Day one

You need Node 22 or later, a project folder, VS Code 1.121 or later, and one agent. Run every line from the project folder. **The package `mcp-spec-loop` is not published on npm yet**: until it is, clone this repository, run `npm install` in it (this builds `dist/`), and use the right-hand column.

| Agent | Register the server (once published) | Until published (local clone) |
| --- | --- | --- |
| Gemini CLI | `gemini mcp add -s project -e SPEC_LOOP_ROOT="$PWD" spec-loop -- npx -y mcp-spec-loop@0.1.0` | `gemini mcp add -s project -e SPEC_LOOP_ROOT="$PWD" spec-loop -- node /path/to/spec-loop/dist/mcp.js` |
| Antigravity CLI | `agy plugin import gemini` after the Gemini line, or commit `examples/consumer/.agents/mcp_config.json` | same, with the local command in `mcp_config.json` |
| Claude Code | `claude mcp add --scope project spec-loop -- npx -y mcp-spec-loop@0.1.0` | `claude mcp add --scope project spec-loop -- node /path/to/spec-loop/dist/mcp.js` |
| Codex | `codex mcp add spec-loop --env SPEC_LOOP_ROOT="$PWD" -- npx -y mcp-spec-loop@0.1.0` | `codex mcp add spec-loop --env SPEC_LOOP_ROOT="$PWD" -- node /path/to/spec-loop/dist/mcp.js` |

Antigravity CLI (`agy`) replaced Gemini CLI for free and Google One accounts in June 2026.

Then install the skills. Gemini CLI, Antigravity and Codex read `.agents/skills/`; Claude Code reads `.claude/skills/`, linked to the same folder:

```sh
mkdir -p .agents/skills && cp -R /path/to/spec-loop/skills/* .agents/skills/
mkdir -p .claude && ln -s ../.agents/skills .claude/skills   # Claude Code only
```

`examples/consumer/` holds every file a project commits for the three agents.

Walkthrough:
1. Ask the agent to create a feature, then run the `framing` skill.
2. Open `spec/README.md` in the preview (Ctrl+Shift+V, Cmd+Shift+V on macOS) and edit a rendered line.
3. Ask the agent to take your changes into account (`reconcile`), then tell it to move to the next phase.

The server looks for `spec/` in the `root` argument of each tool call. Without one, it uses `SPEC_LOOP_ROOT`, then `CLAUDE_PROJECT_DIR` (set by Claude Code), then its working directory. A value still holding an unexpanded `${…}` is skipped. The skills always pass `root`, and `status` and `features` echo the resolved path.

Last, VS Code: commit `.vscode/extensions.json` from `examples/consumer/`. VS Code then proposes three preview extensions when the folder is first opened. Each one is optional, and the documents stay readable without it:

| Extension | Adds | Without it |
| --- | --- | --- |
| `yahyabatulu.vscode-markdown-alert` | callouts: open question `[!IMPORTANT]`, answered `[!NOTE]`, blocking state `[!WARNING]` | a blockquote whose first line names the kind |
| `bierner.markdown-checkbox` | checkboxes in "Left to do" and the question list | a list line starting with `[ ]` or `[x]` |
| `bierner.markdown-footnotes` | footnotes for a textual source of a requirement | a marker and a paragraph below the block |

## Tools

| Tool | Writes | What it does |
| --- | --- | --- |
| `learn` | no | Returns the method by topic; `phases` and `fields` are generated from the schema. |
| `features` | no | Lists every feature: id, phase, completeness, pending owner edits, last modification. |
| `status` | no | Reports one feature: file path, completeness, unaddressed fields, pending edits, last reconciliation, phase history, last backward move. |
| `validate` | no | Checks a feature or a candidate object against the schema and the coverage rules; every error has a JSON pointer. |
| `diff` | no | Compares the regenerated projection with the files on disk; maps each hunk to an id and a pointer; classifies alterations. |
| `create` | yes | Writes the skeleton of a new feature (next FEAT number) and renders it; needs an absolute `root`. |
| `render` | yes | Renders the feature deterministically; refuses while owner edits are unverified. |
| `patch` | yes | Applies an RFC 6902 JSON Patch, validates, writes, re-renders; `id`, `name`, `phase` and `lifecycle` are protected. |
| `phase` | yes | Advances to the next phase when the current one is complete; moves back to an earlier one on the owner's decision with a reason. |
| `reconcile` | yes | Applies the coherent owner edits, turns the others into open questions, restores the projection, records the reconciliation. |

Read-only tools carry `readOnlyHint: true`. Every result carries the same JSON as text and as `structuredContent`.

## Skills

| Skill | When | What the agent does |
| --- | --- | --- |
| `framing` | framing | Interviews the owner one question per field, each with a recommended answer, exploring the repository first. |
| `requirements` | requirements | Writes one EARS sentence per behaviour with facet, priority, title, rationale and source; a screen wireframe for each interface requirement. |
| `acceptance` | acceptance | Drafts Given/When/Then criteria per requirement and asks the owner only for business values. |
| `anchoring` | anchoring | Reads the target repository and anchors each requirement on a file and symbol, without writing code. |
| `verification` | verification | Declares the test of each criterion, writes a missing one at its declared place, runs only the named test files once and records the runner's result. |
| `done` | closing | Checks the closing gate and closes the feature on the owner's decision. |
| `reconcile` | any time | Takes the owner's edits into account: applies the coherent ones, reports the others with the reason. |

Between `anchoring` and `verification`, the agent implements at the anchors with its usual development workflow; spec-loop does not write code. Every phase skill reads the model at `status.file`, changes it only with `patch`, and follows the refusal rule of `method/loop.md`.

## Rendered documents

Each feature lives in `spec/FEAT-nnn-<name>/`. Its `feature.json` is the model and `rendered/` holds the projection. `assets/` holds the svg wireframes, and `.manifest.json` the hash of everything the server last wrote. `spec/README.md` is the index of all features, with a menu by phase and a warning for any feature with pending owner edits.

| File | Content |
| --- | --- |
| `index.md` | Phase diagram, documents, artifacts, what is left to do (task list), questions, history; warnings when the phase waits for answers or tests fail |
| `framing.md` | Intent, context diagram, actors, scope, constraints, assumptions, open questions and answered questions, glossary |
| `requirements.md` | Summary table (id, title, facet, priority, EARS form, origin), then one block per requirement with its wireframes |
| `criteria.md` | One rule per requirement, one Gherkin example per criterion (Given, When, Then) |
| `anchors.md` | Anchors: file, symbol, kind of change, requirements realised |
| `verification.md` | Declared tests and the coverage table |
| `decisions.md` | Decisions, when there are any |

A document appears once its phase is reached. A document of a closed phase opens with a line pointing at the current one. Every document opens and closes with the same navigation, rendered by one partial from the schema's phase list:
- a breadcrumb back to the feature and to all features;
- the menu of the feature's documents in phase order;
- "Previous" and "Next" links at the bottom.

The diff ignores the navigation.

The built-in VS Code preview renders CommonMark, tables and Mermaid; callouts, checkboxes and footnotes need the extensions listed under "Day one", and read as plain blockquotes, list lines and paragraphs without them.

No meaning is carried by colour, and no inline HTML is used. The only exception is the `<!-- id: … -->` and `<!-- ptr: … -->` comments that let the diff find the object behind each block. The rules are in `method/artifacts.md`.

## Principles

- **The JSON is the truth.** The documents are a projection of it; nothing in them exists only in Markdown.
- **The schema governs the lifecycle.** Phases, their order, required fields and coverage rules live in `schema/feature.schema.json`. The code names no phase and no facet.
- **The MCP server is the only writer of `spec/`.** Agents never edit those files with a file tool; a hand edit of `feature.json` is detected and must be reconciled.
- **Rendering is deterministic.** The same model gives the same bytes, so a diff against the disk shows exactly what the owner changed.
- **Owner edits are first-class.** They are never overwritten unread. Each one is applied, or reported with its reason and kept as an open question, and the owner's files are saved before any re-render.

## Further reading

- `docs/vocabulary-research.md`: why each term, the EARS and Gherkin choices, the glossary.
- `docs/integration-guide.md`: how Gemini CLI, Antigravity, Claude Code and Codex load the server and the skills.
- `method/`: the method served by `learn`. `method/index.md` maps each phase to its skill.
- `docs/decisions.md`: every decision, one dated line each.

## Development

```sh
npm install                          # builds dist/ through prepare
npm run typecheck
npx vitest run test/render.test.ts   # one file at a time
npm start                            # the MCP server on stdio
```
