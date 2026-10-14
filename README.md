# spec-loop

A software construction loop driven by a JSON model. An agent keeps one JSON object per feature, validated by a progressive JSON Schema. Handlebars templates project it into a tree of French Markdown files that the owner reads in VS Code. The owner answers in the chat or edits the projected files and asks the agent to verify. The agent maps every edit back to the JSON object it targets and brings the model back into coherence. An edit that widens the scope or breaks coherence is reported, not applied.

The agent works through one interface: a stdio MCP server. It is the only writer of `spec/`.

## Day one

You need a project folder, Node 22 or later, VS Code, and one agent.

1. VS Code: the built-in Markdown preview, plus the extension **Markdown Preview Mermaid Support** (`bierner.markdown-mermaid`) for the diagrams. SVG screens show as images with no extension.
2. Register the MCP server, one line per agent, from the project folder:

   | Agent | Command |
   | --- | --- |
   | Gemini CLI | `gemini mcp add -s project -e SPEC_LOOP_ROOT="$PWD" spec-loop -- npx -y @ng-galien/spec-loop@0.1.0`, or commit `.gemini/settings.json` from `examples/consumer/` |
   | Antigravity CLI | `agy plugin import gemini` after the Gemini line, or `.agents/mcp_config.json` from `examples/consumer/` |
   | Claude Code | `claude mcp add --scope project spec-loop -- npx -y @ng-galien/spec-loop@0.1.0` |
   | Codex | `codex mcp add spec-loop --env SPEC_LOOP_ROOT="$PWD" -- npx -y @ng-galien/spec-loop@0.1.0` |

   Gemini CLI was replaced by Antigravity CLI (`agy`) for free and Google One accounts in June 2026. `agy plugin import gemini` converts the Gemini MCP servers, extensions and skills.

3. Skills: copy `skills/framing` and `skills/verify` into the project's `.agents/skills/` (read by Gemini CLI, Antigravity and Codex). Then link `.claude/skills` to `../.agents/skills` for Claude Code. `examples/consumer/` holds every file a project commits for the three agents.

Until the package is published on npm, replace `npx -y @ng-galien/spec-loop@0.1.0` with `npx -y /path/to/spec-loop` (after `npm install` in this repository) or with `node /path/to/spec-loop/dist/mcp.js`.

### Walkthrough

1. Ask the agent to create a feature: it calls `create`, which writes `spec/FEAT-001-<name>/feature.json` in phase `framing` and renders it. Open `spec/README.md` in the preview.
2. Run the `framing` skill. The agent asks one question at a time, each with a recommended answer. It writes each answer with `patch`, and `rendered/cadrage.md` updates after every answer.
3. Edit a rendered file in VS Code: reword a line, add an exclusion. Keep the `<!-- id: … -->` comments in place.
4. Ask the agent to verify your changes: the `verify` skill calls `status` and `diff`. It applies the coherent edits, reports the others with the reason, and calls `verify`, which re-renders and records the verification.
5. When the index says the phase is complete and nothing is pending, tell the agent to move on: it calls `phase`.

## Layout

```text
schema/feature.schema.json      progressive schema: x-phases, x-checks, if/then per phase, one-sentence descriptions
templates/*.hbs                 one template per rendered file (French), plus artifact.hbs and spec-index.hbs
method/*.md                     hand-written method served by `learn` (phases and fields are generated from the schema)
skills/framing/SKILL.md         framing interview
skills/verify/SKILL.md          reconciliation of the owner's edits
src/lib/                        library: validate, render, diff, patch, lifecycle, features, learn
src/mcp.ts                      stdio MCP server (bin `spec-loop`)
test/*.test.ts                  vitest
spec/README.md                  generated index of features
spec/FEAT-001-<name>/
  feature.json                  the model (written only by the MCP)
  rendered/                     the projection the owner reads and edits
  assets/                       svg screens referenced by artifacts
  .manifest.json                hash and render time of feature.json, every rendered file and asset
  .spec-loop/overwritten/       owner files kept when a verify re-renders over them
gemini-extension.json, GEMINI.md, .claude-plugin/, .codex-plugin/, .agents/plugins/, .mcp.json
examples/consumer/              files a project commits to use spec-loop with the three agents
```

## Tools

| Tool | Writes | What it does |
| --- | --- | --- |
| `learn` | no | Method by topic; `phases` and `fields` are generated from the schema. |
| `features` | no | One line per feature: id, name, phase, completeness, pending owner edits, last modification. |
| `status` | no | One feature: phase, completeness (recomputed), pending edits and alterations (recomputed), last verify, phase history. |
| `validate` | no | Schema plus coverage checks; every error has a JSON pointer and a kind (`incomplete` or `invalid`). |
| `diff` | no | Regenerated projection against the disk and the manifest; hunks mapped to block id and pointer; alterations classified. |
| `create` | yes | Next FEAT number, skeleton in the first phase, rendered. |
| `render` | yes | Deterministic projection; refuses while owner edits are unverified. |
| `patch` | yes | RFC 6902 patch, validated before writing, then re-rendered; `id`, `name`, `phase`, `lifecycle` are protected. |
| `phase` | yes | Next phase of the schema, only when complete and nothing is pending; records date and author. |
| `verify` | yes | Applies the coherent edits, records the reported ones, re-renders, writes `lifecycle.lastVerify`. |

Read-only tools carry `readOnlyHint: true`, so Codex with `default_tools_approval_mode = "writes"` asks only for writes. Each result carries the same JSON as text `content` and as `structuredContent`. Gemini reads only the text; Claude Code and Codex read the structured part.

**Project root.** Every tool takes `root`. Without it the server uses `SPEC_LOOP_ROOT`, then `CLAUDE_PROJECT_DIR`, then its working directory:
- Claude Code sets `CLAUDE_PROJECT_DIR`.
- The Gemini extension and the Gemini command line above set `SPEC_LOOP_ROOT`.
- Codex gives neither, hence the `--env` in its line.

The skills always pass `root`.

## How the four core operations work

- **validate(json)**: Ajv (draft 2020-12, formats) against the schema. Ajv errors become `{pointer, message, kind}`. `incomplete` covers missing required fields, empty lists and an open question. `invalid` covers a wrong shape, a section of a later phase, an unknown property and a bad pattern. Code then adds what the schema cannot express:
  - unique ids and resolved references;
  - the statement starts with the keyword of its EARS pattern;
  - an AC id carries its requirement number;
  - the coverage checks that `x-phases` switches on from their phase onward (`requirementHasCriterion`, `mustRequirementHasAnchor`, `criterionHasTest`, `testNameCarriesCriterion`, `mustTestsPassing`, `noOpenQuestion`).
- **render(feature)**: builds a view model from the JSON and runs one Handlebars template per file. It normalizes whitespace and writes only the files of the phases reached. Each file starts with its source pointer and template; each block starts with `<!-- id: … -->` or `<!-- ptr: … -->`. Same input, same bytes. It then refreshes `.manifest.json` (an entry's timestamp moves only when its hash changes) and `spec/README.md`.
- **diff(feature)**: renders in memory, then runs a zero-context line diff against each file on disk. Each hunk is mapped to the nearest marker above its first changed line, which gives the block id and its JSON pointer through an id index of the JSON. The hunk also lists the markers it touches and the ids the owner added. The manifest separates owner edits from a projection that is only stale, and classifies alterations: `rendered-changed`, `asset-changed`, `feature-changed`, `rendered-missing`, `rendered-extra`.
- **patch(feature, ops)**: applies the RFC 6902 ops with fast-json-patch on a copy and validates the result. It writes only if no `invalid` error remains, then re-renders. It refuses while the owner has unverified edits; `verify` is the path that may overwrite them, after keeping a copy.

## Decisions

- The coordinator's bindings are applied. The `bin/spec-loop` CLI was dropped: the MCP server is the only interface. Vocabulary follows `docs/vocabulary-research.md` (English keys, phases `framing` to `done`, EARS requirements, Gherkin criteria, 23-term glossary). The lifecycle and the phases are driven by the schema. Artifacts and alteration tracking were added, and packaging follows `docs/integration-guide.md`.
- Phases are never mixed: besides the cumulative `required` rules, the schema rejects a section of a later phase with a `false` schema. `decisions` and `artifacts` are allowed in every phase.
- `patch` accepts `incomplete` errors and refuses `invalid` ones. A phase is filled step by step; the phase gate is the `phase` tool, which requires `complete`.
- Questions carry a `recommendation` field (not in the research skeleton), needed by the interview method. Questions are `open` or `answered`, and an open question keeps any phase incomplete.
- Coverage checks are named in code and bound to phases in `x-phases[].checks`. Their texts live in `x-checks`. `src/` holds no phase name.
- Features are numbered `FEAT-001`; the folder is `FEAT-001-<name>`. Tools accept the id, the name or the folder. Cross-feature references are `FEAT-001/REQ-002`.
- Owner edits are never lost. `render` and `patch` refuse to overwrite them. `verify` requires `applied + reported` to equal the pending count, keeps the owner's files in `.spec-loop/overwritten/`, and records `lastVerify`.
- Every alteration (rendered file, svg, `feature.json`, missing or extra file) counts as pending until a `verify` accounts for it, so `phase` cannot advance over an unread change.
- Artifacts render once, right after the first requirement or criterion they illustrate. An artifact with no id renders in the framing document after the intent.
- Rendered file names are French (`cadrage.md`, `exigences.md`, `criteres.md`, `ancrage.md`, `verification.md`, `decisions.md`), as they are owner-facing. Criteria use the French Gherkin keywords (Règle, Exemple, Soit, Et, Quand, Alors).
- `learn` returns its text as JSON in both `content` and `structuredContent`, for the identical-result rule.
- Dependencies: handlebars, ajv, ajv-formats, fast-json-patch, diff, @modelcontextprotocol/sdk, and zod, which the SDK requires for tool schemas. TypeScript 5.9 and vitest 5 for development.

## Development

```sh
npm install          # builds dist/ through prepare
npm run typecheck
npx vitest run test/render.test.ts   # one file at a time
npm start            # the MCP server on stdio
```
