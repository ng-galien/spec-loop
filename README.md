# spec-loop

A software construction loop driven by a JSON model. An agent keeps one JSON object per feature, validated by a progressive JSON Schema. Handlebars templates project it into a tree of French Markdown files that the owner reads in VS Code. The owner answers in the chat or edits the projected files and asks the agent to verify. The agent maps every edit back to the JSON object it targets and brings the model back into coherence. An edit that widens the scope or breaks coherence is reported, not applied.

The agent works through one interface: a stdio MCP server. It is the only writer of `spec/`.

## Day one

You need a project folder, Node 22 or later, VS Code, and one agent.

1. VS Code 1.121 or later: the built-in Markdown preview renders the projection and its Mermaid diagrams (the `bierner.markdown-mermaid` extension is no longer needed). SVG screens show as images. To check a rendering, open the file and press Ctrl+Shift+V (Cmd+Shift+V on macOS); it must read well in both the light and the dark theme.
   VS Code then proposes three preview extensions recommended in `.vscode/extensions.json` (also in `examples/consumer/`). Each is optional, and every document stays readable without it:
   - `yahyabatulu.vscode-markdown-alert` renders the GitHub callouts (`> [!IMPORTANT]` for an open question, `> [!NOTE]` for an answered one, `> [!WARNING]` for a blocking state);
   - `bierner.markdown-checkbox` renders the task lists (« Reste à faire », the questions in the index) as checkboxes;
   - `bierner.markdown-footnotes` renders the footnotes that cite a textual source of a requirement.
2. Register the MCP server, one line per agent, from the project folder:

   | Agent | Command |
   | --- | --- |
   | Gemini CLI | `gemini mcp add -s project -e SPEC_LOOP_ROOT="$PWD" spec-loop -- npx -y @ng-galien/spec-loop@0.1.0`, or commit `.gemini/settings.json` from `examples/consumer/` with your absolute project path in `SPEC_LOOP_ROOT` (Gemini CLI 0.1.12 does not substitute `${workspacePath}` there) |
   | Antigravity CLI | `agy plugin import gemini` after the Gemini line, or `.agents/mcp_config.json` from `examples/consumer/` |
   | Claude Code | `claude mcp add --scope project spec-loop -- npx -y @ng-galien/spec-loop@0.1.0` |
   | Codex | `codex mcp add spec-loop --env SPEC_LOOP_ROOT="$PWD" -- npx -y @ng-galien/spec-loop@0.1.0` |

   Gemini CLI was replaced by Antigravity CLI (`agy`) for free and Google One accounts in June 2026. `agy plugin import gemini` converts the Gemini MCP servers, extensions and skills.

3. Skills: copy the six folders of `skills/` (`framing`, `acceptance`, `anchoring`, `verification`, `done`, and `verify` for the owner's edits) into the project's `.agents/skills/` (read by Gemini CLI, Antigravity and Codex). Then link `.claude/skills` to `../.agents/skills` for Claude Code. `examples/consumer/` holds every file a project commits for the three agents.

Until the package is published on npm, replace `npx -y @ng-galien/spec-loop@0.1.0` with `npx -y /path/to/spec-loop` (after `npm install` in this repository) or with `node /path/to/spec-loop/dist/mcp.js`.

### Walkthrough

1. Ask the agent to create a feature: it calls `create`, which writes `spec/FEAT-001-<name>/feature.json` in phase `framing` and renders it. Open `spec/README.md` in the preview.
2. Run the `framing` skill. The agent asks one question per field of the phase, optional ones included, each with a recommended answer. It writes each answer with `patch`, and `rendered/cadrage.md` updates after every answer. It stops when `status` says the phase is complete and no field is left unaddressed.
3. Edit a rendered file in VS Code: reword a line, add an exclusion. Keep the `<!-- id: … -->` comments in place.
4. Ask the agent to verify your changes: the `verify` skill calls `status` and `diff`. It applies the coherent edits and reports the others with the reason; each reported point becomes an open question. It then calls `verify`, which restores the projection exactly and records the verification.
5. When the index says the phase is complete and nothing is pending, tell the agent to move on: it calls `phase`.

## Layout

```text
schema/feature.schema.json      progressive schema: x-phases, x-checks, if/then per phase, one-sentence descriptions
templates/*.hbs                 one template per rendered file (French), plus artifact.hbs and spec-index.hbs
method/*.md                     hand-written method served by `learn` (phases and fields are generated from the schema)
skills/framing/SKILL.md         framing interview
skills/acceptance/SKILL.md      criteria drafted per requirement, owner asked for business values only
skills/anchoring/SKILL.md       anchors read from the target repository, no code written
skills/verification/SKILL.md    tests declared per criterion, status from one run of the named files
skills/done/SKILL.md            closing gate and the owner's decision
skills/verify/SKILL.md          reconciliation of the owner's edits
src/lib/                        library: validate, render, diff, patch, lifecycle, features, learn
src/mcp.ts                      stdio MCP server (bin `spec-loop`)
test/*.test.ts                  vitest
spec/README.md                  generated index of features
spec/feature.schema.json        copy of the schema, target of each feature.json `$schema` (machine-independent)
spec/FEAT-001-<name>/
  feature.json                  the model (written only by the MCP)
  rendered/                     the projection the owner reads and edits
  assets/                       svg screens referenced by artifacts
  .manifest.json                hash and render time of feature.json, every rendered file and asset
  .spec-loop/                   local state, not committed: feature.last.json (last known good model), overwritten/<time>/ (owner files replaced by a verify)
gemini-extension.json, GEMINI.md, .claude-plugin/, .codex-plugin/, .agents/plugins/, .mcp.json
examples/consumer/              files a project commits to use spec-loop with the three agents
```

## Tools

| Tool | Writes | What it does |
| --- | --- | --- |
| `learn` | no | Method by topic; `phases` and `fields` are generated from the schema. |
| `features` | no | One line per feature: id, name, phase, completeness, pending owner edits, last modification. |
| `status` | no | One feature: resolved root and file, phase, completeness (recomputed), fields of the phase never set, pending edits and alterations (recomputed), last verify, phase history. |
| `validate` | no | Schema plus coverage checks; every error has a JSON pointer and a kind (`incomplete` or `invalid`). |
| `diff` | no | Regenerated projection against the disk and the manifest; hunks mapped to block id and pointer; alterations classified. |
| `create` | yes | Next FEAT number, skeleton in the first phase, rendered; needs an absolute `root`. |
| `render` | yes | Deterministic projection; refuses while owner edits are unverified. |
| `patch` | yes | RFC 6902 patch, validated before writing, then re-rendered; `id`, `name`, `phase`, `lifecycle` are protected. |
| `phase` | yes | Next phase of the schema, only when complete and nothing is pending; records date and author. |
| `verify` | yes | Applies the coherent edits, turns each reported one into an open question, accepts or restores a hand-edited `feature.json`, restores the projection exactly, writes `lifecycle.lastVerify`. |

Read-only tools carry `readOnlyHint: true`, so Codex with `default_tools_approval_mode = "writes"` asks only for writes. Each result carries the same JSON as text `content` and as `structuredContent`. Gemini reads only the text; Claude Code and Codex read the structured part.

**Project root.** Every tool takes `root`. Without it the server uses `SPEC_LOOP_ROOT`, then `CLAUDE_PROJECT_DIR`, then its working directory, skipping any value that still holds an unexpanded `${…}`. `status` and `features` echo the resolved root and `spec/` path:
- Claude Code sets `CLAUDE_PROJECT_DIR`.
- The Gemini command line above sets `SPEC_LOOP_ROOT`; the Gemini extension sets nothing, so the skills' `root` is what counts.
- Codex gives neither, hence the `--env` in its line.

The skills always pass `root`.

## How the four core operations work

- **validate(json)**: Ajv (draft 2020-12, formats) against the schema. Ajv errors become `{pointer, message, kind}`. `incomplete` covers missing required fields, empty lists and an open question. `invalid` covers a wrong shape, a section of a later phase, an unknown property and a bad pattern. Code then adds what the schema cannot express:
  - unique ids and resolved references;
  - the statement starts with the keyword of its EARS pattern;
  - an AC id carries its requirement number;
  - the coverage checks that `x-phases` switches on from their phase onward (`requirementHasCriterion`, `mustRequirementHasAnchor`, `criterionHasTest`, `testNameCarriesCriterion`, `testsPassingOrJustified`, `noOpenQuestion`), plus the declared rule `interfaceHasScreen`.
- **render(feature)**: builds a view model from the JSON and runs one Handlebars template per file. It normalizes whitespace and writes only the files of the phases reached. Each file starts with its source pointer and template; each block starts with `<!-- id: … -->` or `<!-- ptr: … -->`. Same input, same bytes. It then refreshes `.manifest.json` (an entry's timestamp moves only when its hash changes) and `spec/README.md`.
- **diff(feature)**: renders in memory, then runs a zero-context line diff against each file on disk. Each hunk is mapped to the nearest marker above its first changed line, which gives the block id and its JSON pointer through an id index of the JSON. The hunk also lists the markers it touches and the ids the owner added. The manifest separates owner edits from a projection that is only stale, and classifies alterations: `rendered-changed`, `asset-changed`, `feature-changed`, `rendered-missing`, `rendered-extra`.
- **patch(feature, ops)**: applies the RFC 6902 ops with fast-json-patch on a copy and validates the result. It writes only if no `invalid` error remains, then re-renders. It refuses while the owner has unverified edits; `verify` is the path that may overwrite them, after keeping a copy.

## Decisions

- The coordinator's bindings are applied. The `bin/spec-loop` CLI was dropped: the MCP server is the only interface. Vocabulary follows `docs/vocabulary-research.md` (English keys, phases `framing` to `done`, EARS requirements, Gherkin criteria, 24-term glossary, with « facet » added by the owner). The lifecycle and the phases are driven by the schema. Artifacts and alteration tracking were added, and packaging follows `docs/integration-guide.md`.
- Phases are never mixed: besides the cumulative `required` rules, the schema rejects a section of a later phase with a `false` schema. `decisions` and `artifacts` are allowed in every phase.
- `patch` accepts `incomplete` errors and refuses `invalid` ones. A phase is filled step by step; the phase gate is the `phase` tool, which requires `complete`.
- Questions carry a `recommendation` field (not in the research skeleton), needed by the interview method. Questions are `open` or `answered`, and an open question keeps any phase incomplete.
- Coverage checks are named in code and bound to phases in `x-phases[].checks`. Their texts live in `x-checks`. `src/` holds no phase name.
- Features are numbered `FEAT-001`; the folder is `FEAT-001-<name>`. Tools accept the id, the name or the folder. Cross-feature references are `FEAT-001/REQ-002`.
- Owner edits are never lost. `render` and `patch` refuse to write while anything is pending: an edited, deleted or added rendered file, an edited svg, or a hand-edited `feature.json`. `verify` requires `applied + reported` to equal the pending count. It keeps the owner's files under `.spec-loop/overwritten/<time>/`, removes files added by hand, recreates deleted ones, and records `lastVerify`.
- A hand-edited `feature.json` is accepted by `verify` only with a reason (recorded in `lifecycle.acceptedChanges`) and only if `phase`, `id`, `name` and `lifecycle` are untouched; otherwise it is restored from `.spec-loop/feature.last.json`. A hand-changed phase therefore cannot bypass the `phase` gate.
- Every point `verify` reports to the owner becomes an open question in `framing.questions`, which keeps the phase incomplete until it is answered.
- `status.unaddressed` lists the fields of the current phase never set, optional ones included; an explicit empty array counts as addressed. It is the framing skill's stop condition together with `complete`.
- `.spec-loop/` is local state and is ignored by git; on a fresh checkout, a hand-edited `feature.json` can only be accepted.
- Every alteration (rendered file, svg, `feature.json`, missing or extra file) counts as pending until a `verify` accounts for it, so `phase` cannot advance over an unread change.
- Artifacts render once, right after the first requirement or criterion they illustrate. An artifact with no id renders in the framing document after the intent.
- `artifacts[].illustrates` takes any feature id (`anyRef`: requirement, criterion, anchor, decision, artifact, actor, constraint, assumption, question, with an optional `FEAT-nnn/` prefix), not only requirements and criteria. The widening was made during the owner's first run, so that a diagram can illustrate a constraint or an actor. Placement is unchanged: next to the first requirement or criterion listed, otherwise in the framing document.
- The closing gate is declared in the schema: a test name starts with a criterion id it verifies and contains each of them (`testNameCarriesCriterion`, from verification); every test is passing or uses a method other than `test` with a `reason`, which the schema requires for such methods (`testsPassingOrJustified`, in `done`). Six skills cover the loop; `method/index.md` maps each phase to its skill.
- Leaving a phase evaluates the entry rules of the next one: rules marked `gate: entry` (`interfaceHasScreen`, `testsPassingOrJustified`) and every rule of a phase that produces nothing (the last). `phase` refuses with each blocking item as a reason. This closes a defect found on FEAT-001, which had entered `done` with 22 tests not passing.
- `phase` also moves a feature back: `to` an earlier phase, `by: "owner"` only, with a French `reason` recorded in `phaseHistory` and shown by `status.lastBackwardMove`. Later sections are kept in the JSON, tolerated by validation because the history shows their phase was reached, and not rendered until it is reached again.
- Every rendered document opens and closes with the same navigation: a breadcrumb (all features › the feature › the document), the menu of the feature's documents in phase order (current one in bold, documents of phases not reached as plain text), a rule, and at the bottom « Précédent » / « Suivant » links. The feature index carries the breadcrumb only; `spec/README.md` adds a menu of features by phase. One partial, `templates/nav.hbs`, renders it from `x-phases`; it sits between `<!-- nav -->` and `<!-- /nav -->`, before the first marker and after the last, and the diff attributes its lines to no id and no pointer.
- The built-in preview stays CommonMark by VS Code policy (microsoft/vscode#245064). Three small extensions are accepted for callouts, task lists and footnotes, on one condition: without them a callout reads as a blockquote, a checkbox as a list line, a footnote as a marker and a paragraph. The index raises a `[!WARNING]` when the phase waits for the owner's answers or when tests fail or are missing; `spec/README.md` raises one per feature with pending owner edits (a feature's own index cannot, since rendering is refused while edits are pending).
- Templates target the VS Code preview (CommonMark plus tables, sanitised HTML, Mermaid following the editor theme): no inline HTML, id and ptr comments alone on their line above the block or list item they mark, no meaning carried by colour; the index diagram marks the current phase by its label « ◀ actuelle », a stadium shape and dashed links to the next phases. Rules in `method/artifacts.md`.
- Every requirement has a required `facet` (interface, behaviour, data, integration, security), described value by value in the schema (`x-enumDescriptions`) with French labels (`x-labels`); the summary table of `exigences.md` shows it. A requirement without facet is reported as incomplete, never invalid, so older features keep loading.
- Coverage checks can be declared as rules in `x-checks`: requirements matching a filter must be illustrated by an artifact matching another filter. `interfaceHasScreen` (facet `interface` needs a `screen` artifact in `svg`) is listed under `acceptance` with `gate: entry`, so it is already checked in the requirements phase: `status` shows « REQ-nnn attend sa maquette d'écran » and `phase` refuses to leave requirements without the wireframe. `src/` names no facet and no artifact kind.
- Requirements have an optional French `title`, shown in the heading (« REQ-004 · Liste par curseur ») and in the summary table that opens `exigences.md`; the table links to the heading slug VS Code computes (lowercase, spaces to dashes, punctuation such as « · » removed, URI-encoded).
- Under « Tranché », the recommendation is a single italic line « Recommandation proposée » right after the answer.
- In the framing document, questions are split: « À trancher » (open, with the recommendation) first, then « Tranché » (answered, with the answer). The index's « Reste à faire » list is unchanged.
- A document of a phase earlier than the current one opens, after its source comment, with one line naming its closed phase and linking to the current phase document; the current phase document carries no such line.
- Tests never read the live `spec/` folder: they copy `test/fixtures/framing.json` (the guinea pig before the owner's answers) or `test/fixtures/requirements.json` into a temporary project.
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
