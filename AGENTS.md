# AGENTS.md

Instructions for coding agents working **on** this repository. If you are an agent **using** spec-loop in another project, read `GEMINI.md` or the skills under `skills/` instead.

## What this project is

spec-loop is an MCP server (`src/mcp.ts`) plus seven Agent Skills. It keeps one JSON model per feature under `spec/FEAT-xxx-<name>/feature.json`, validates it against the progressive schema `schema/feature.schema.json`, and renders it with Handlebars templates (`templates/*.hbs`) into Markdown documents read in the VS Code preview. The lifecycle (phases, entry gates, coverage rules, labels) is declared in the schema under `x-phases`, `x-checks`, `x-labels` and `x-enumDescriptions`; nothing about phases is hard-coded in TypeScript.

Node 22 or later, ESM, TypeScript, Vitest. The published npm package is `mcp-spec-loop`.

## Commands

```bash
npm install
npm run build        # assembles skills, then compiles src/ to dist/
npm run typecheck    # src and test, no emit
npx vitest run test/<file>.test.ts   # one test file
npm run assemble     # regenerates skills/ from skills-src/
npm start            # runs dist/mcp.js on stdio
```

Run the one test file that covers your change, plus `npm run typecheck`. Do not run the whole suite as a routine step.

To exercise the server as a client, use `scripts/` or a real stdio MCP client against `dist/mcp.js`; every tool takes `root`, the absolute path of the project that holds `spec/`.

## Layout

| Path | Role |
| --- | --- |
| `src/mcp.ts` | the MCP server: tool definitions and their wiring |
| `src/lib/` | the model: `validate`, `render`, `diff`, `patch`, `lifecycle`, `features`, `learn`, `schema`, `paths` |
| `schema/feature.schema.json` | the progressive schema; the single source for phases, gates and labels |
| `templates/` | Handlebars projection; `nav.hbs` is the navigation partial shared by every document |
| `method/` | the embedded method served by the `learn` tool |
| `skills-src/` | skill sources: `parts/` shared by all skills, one `skill.yaml` + `body.md` per skill |
| `skills/` | **generated** `SKILL.md` files; never edit them by hand |
| `test/` | Vitest; fixtures under `test/fixtures/` |
| `spec/` | the live example feature FEAT-001, written only through the MCP server |
| `docs/decisions.md` | one dated line per decision; `docs/vocabulary-research.md` fixes the vocabulary |
| `examples/consumer/` | how a consuming project configures Gemini CLI, Claude Code and Codex |
| `site/`, `assets/brand/` | the one-page site and the visual identity (`assets/brand/brand.md`) |

## Rules

- **Everything is in English**: code, comments, schema descriptions, templates, labels, rendered file names, skills, docs, commit messages.
- **The schema governs the lifecycle.** A new rule goes into `x-checks` and is switched on by `x-phases`; a new display label goes into `x-labels`. Do not special-case a phase in TypeScript.
- **Skills are generated.** Change `skills-src/`, run `npm run assemble`, commit both; `test/skills.test.ts` fails on drift. The frontmatter of a `SKILL.md` must stay first.
- **`spec/` is written only by the MCP server.** To change FEAT-001, run the tools (`patch`, `render`, `reconcile`, `phase`); never edit `feature.json`, `.manifest.json` or `rendered/` with a file tool. `.spec-loop/` is local state and is ignored by git.
- **Templates target the VS Code preview**: CommonMark plus tables and Mermaid; callouts, task lists and footnotes may be used because they degrade to readable text; no inline HTML; HTML comments carrying ids or pointers sit alone on their line; no meaning carried by colour alone.
- **Tests use fixtures**, never the live `spec/` folder.
- **Vocabulary is fixed** by `docs/vocabulary-research.md`: EARS requirements with RFC 2119 priority, Given/When/Then criteria bound to one requirement, anchors as file plus symbol, tests named by the criterion id. Do not introduce synonyms.
- **Record decisions.** Any change of behaviour the owner would notice gets one dated line in `docs/decisions.md`, in the same commit.
- **Visual identity**: slate greys, one blue, a sane green and a blocking red, as described in `assets/brand/brand.md`. No warm palette.

## Commits

One subject line in English, imperative or descriptive, stating what changed for the user of the tool (for example `Rename the npm package to mcp-spec-loop, unscoped`). Group a code change with its tests, its decision line and its regenerated skills. Do not push unless asked.

## When a tool is renamed or its contract changes

Update together: `src/mcp.ts`, the skill sources that call it, `method/`, `README.md`, `examples/consumer/`, `GEMINI.md`, `docs/decisions.md`. Anyone with the server configured must restart it.
