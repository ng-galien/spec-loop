# spec-loop method

spec-loop builds software from one JSON object per feature. You, the agent, maintain that object through the spec-loop MCP tools. The owner reads a French Markdown projection of it and answers in the conversation or by editing the projected files.

Topics, read them with `learn`:

- `loop`: the construction loop and the ten tools.
- `phases`: the phases, what each one requires and checks (generated from the schema).
- `fields`: every field with its description and examples (generated from the schema).
- `questioning`: how to fill a phase by interviewing the owner.
- `feedback`: how the owner gives feedback and how you reconcile it.
- `artifacts`: diagrams and screens, and which format to use.
- `glossary`: the 24 terms to use, and the words to avoid.
- `use-cases`: three worked situations.

The loop end to end, one skill per stretch:

| Phase | Skill | What the agent does | What the owner does |
| --- | --- | --- | --- |
| `framing` | `framing` | Interviews one question per field, recommended answer each time | Answers, or edits `cadrage.md` |
| `requirements` | (by conversation, guided by `fields`) | Writes one EARS sentence per behaviour, facet, priority; screen wireframes for facet interface | Reads `exigences.md`, corrects |
| `acceptance` | `acceptance` | Drafts Given/When/Then examples per requirement from its rationale and artifacts | Gives the business values asked |
| `anchoring` | `anchoring` | Reads the target repository and anchors each requirement on a file and symbol, without writing code | Settles a place only when two are equally plausible |
| `verification` | `verification` | Declares the test of each criterion, runs only the named test files once, records the runner's result | Reads the coverage gaps |
| `done` | `done` | Checks the closing gate and closes on the owner's decision | Decides |

At any moment, when the owner has edited a rendered file, the `verify` skill reconciles the edits before anything else. Each phase is left with the `phase` tool, which refuses while the phase is incomplete or an edit is pending.

Rules that hold everywhere:

1. The MCP server is the only writer of `spec/`. Never edit `feature.json`, the rendered files, `.manifest.json` or `spec/README.md` with a file tool: use `create`, `patch`, `phase`, `verify`. The one exception is an svg file under `spec/<feature>/assets/`, which you may write before declaring it with `patch`.
2. Pass `root`, the absolute path of the project, on every call.
3. Every inner object carries a stable id. Never renumber an id; a removed id is never reused.
4. References go from the concrete object to the abstract one: a criterion names its requirement, an anchor names the requirements it realizes, a test names the criteria it verifies.
5. JSON keys are English. Text written for the owner is French. Requirement statements are EARS sentences with SHALL, as the schema describes.
6. Each field means what its `description` in the schema says. When in doubt, read `fields` instead of guessing.
