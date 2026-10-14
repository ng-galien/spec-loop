# Decisions

One line per decision, dated. The README links here.

- 2026-10-14: The MCP server is the only interface; the planned `bin/spec-loop` CLI was dropped.
- 2026-10-14: Vocabulary follows `docs/vocabulary-research.md`: English keys, EARS requirements, Gherkin criteria, a 24-term glossary including "facet".
- 2026-10-14: Phases are never mixed: the schema rejects a section of a later phase, except one already reached before a backward move.
- 2026-10-14: `patch` writes when no error is `invalid`; `incomplete` errors only say what the phase still needs.
- 2026-10-14: Questions carry a `recommendation`; an open question keeps any phase incomplete.
- 2026-10-14: Coverage rules live in `x-checks`, are switched on by `x-phases`, and may be declared as filters (requirement ↔ artifact).
- 2026-10-14: Leaving a phase evaluates the entry rules of the next one (`gate: entry`, and every rule of a phase that produces nothing). This fixed FEAT-001 entering `done` with 22 tests not passing.
- 2026-10-14: `phase` moves back only on the owner's decision with a reason; later sections are kept and not rendered.
- 2026-10-14: Features are numbered `FEAT-001`, in folders `FEAT-001-<name>`; tools accept the id, the name or the folder.
- 2026-10-14: Every alteration (rendered file, svg, `feature.json`, missing or extra file) is pending until `verify` accounts for it.
- 2026-10-14: A hand-edited `feature.json` is accepted only with a recorded reason and with `phase`, `id`, `name`, `lifecycle` untouched; otherwise it is restored from `.spec-loop/feature.last.json`.
- 2026-10-14: Each point `verify` reports becomes an open question in the framing.
- 2026-10-14: `status.unaddressed` lists optional fields never set; an empty array counts as addressed.
- 2026-10-14: Every requirement has a `facet`; facet `interface` requires an svg screen wireframe before leaving the requirements phase.
- 2026-10-14: Requirements have an optional `title`; the summary table links to VS Code heading slugs.
- 2026-10-14: A test name starts with the id of a criterion it verifies; a method other than `test` needs a `reason`.
- 2026-10-14: Artifacts render next to the first requirement or criterion they illustrate, otherwise in the framing document; `illustrates` takes any feature id.
- 2026-10-14: Templates target the VS Code preview: CommonMark plus tables, no inline HTML, id and ptr comments alone on their line, no meaning by colour.
- 2026-10-14: Three degradable preview extensions are accepted (callouts, checkboxes, footnotes); VS Code keeps the built-in preview to CommonMark (microsoft/vscode#245064).
- 2026-10-14: Every document carries the same navigation from one partial; the diff attributes it to no object.
- 2026-10-14: Tests use their own fixtures under `test/fixtures/`, never the live `spec/` folder.
- 2026-10-14: `.spec-loop/` is local state, ignored by git.
- 2026-10-14: The npm package is `mcp-spec-loop`, unscoped; the repository and product keep the name spec-loop.
- 2026-10-14: Dependencies: handlebars, ajv, ajv-formats, fast-json-patch, diff, @modelcontextprotocol/sdk and zod (required by the SDK).
- 2026-10-14: spec-loop specifies and does not implement: the code is written at the anchors between anchoring and verification, with the agent's usual workflow.
- 2026-10-14: The tool and skill that take owner edits into account are named `reconcile`, so that they never collide with the verification phase; `lifecycle.lastVerify` keeps its name for compatibility.
- 2026-10-14: Each phase has its skill, `requirements` included; every phase skill names where the model is read, shows one patch example, applies the refusal rule of `method/loop.md`, and stops on the same sentence.
- 2026-10-14: The index's "Left to do" names the object and what is left ("AC-001.1 · test to write"), in natural order; the coverage table has a status column and a total.
- 2026-10-14: Display labels of enum values (anchor kind and change, test framework, level, method, status, requirement facet) come from `x-labels` in the schema.
- 2026-10-14: The `phases` topic lists under each phase the entry rules of the next one; field lists live only in the `fields` topic.
- 2026-10-14: Everything is in English, by the owner's decision: JSON keys, schema descriptions, templates, labels, rendered file names (`framing.md`, `requirements.md`, `criteria.md`, `anchors.md`, `verification.md`, `decisions.md`), method, skills and FEAT-001's content; EARS statements stay in English, which closes the language question. Lifecycle history written before (one backward-move reason) stays as recorded, since `lifecycle` cannot be patched.
- 2026-10-14: A file the MCP wrote and no longer produces (same hash as in the manifest) is a stale projection removed by the next render, not an owner edit.
- 2026-10-14: Skills are assembled from `skills-src/` (shared parts plus one `skill.yaml` and `body.md` per skill) by `npm run assemble`; the generated `SKILL.md` carries a "do not edit" comment right after its frontmatter (the frontmatter must stay first), the Gemini, Claude and Codex manifests read `skills/` directly, `examples/consumer/` gets a copy, and a test fails on drift.
