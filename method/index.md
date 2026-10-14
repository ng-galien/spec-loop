# spec-loop method

spec-loop builds software from one JSON object per feature. You, the agent, maintain that object through the spec-loop MCP tools. The owner reads a Markdown projection of it and answers in the conversation or by editing the projected files.

Topics, read them with `learn`:

- `loop`: the construction loop, the ten tools and the refusal rule.
- `phases`: the phases, what each one requires and checks (generated from the schema).
- `fields`: every field with its description and examples (generated from the schema).
- `questioning`: how to fill a phase by interviewing the owner.
- `feedback`: how the owner gives feedback and how you reconcile it (`reconcile` skill).
- `artifacts`: diagrams and screens, and which format to use.
- `glossary`: the 24 terms to use, and the words to avoid.
- `use-cases`: three worked situations.
- `project`: how a project adds hooks and instructions to the loop with `spec/spec-loop.json`.

The loop end to end, one skill per stretch. spec-loop specifies; it does not implement: the code is written between anchoring and verification, outside spec-loop.

| Phase | Skill | What the agent does | What the owner does |
| --- | --- | --- | --- |
| `framing` | `framing` | Interviews one question per field, recommended answer each time | Answers, or edits the framing document |
| `requirements` | `requirements` | Writes one EARS sentence per behaviour with facet, priority, title, rationale, source; a screen wireframe for each interface requirement | Reads the requirements, corrects |
| `acceptance` | `acceptance` | Drafts Given/When/Then examples per requirement from its rationale and artifacts | Gives the business values asked |
| `anchoring` | `anchoring` | Reads the target repository and anchors each requirement on a file and symbol, without writing code | Settles a place only when two are equally plausible |
| (outside spec-loop) | the agent's usual development workflow | Implements at the anchors | Reviews the code as usual |
| `verification` | `verification` | Declares the test of each criterion, writes a missing one at its declared place, runs only the named test files once, records the runner's result | Reads the coverage gaps |
| `done` | `done` | Checks the closing gate and closes on the owner's decision | Decides |

At any moment, when the owner has edited a rendered file, the `reconcile` skill takes the edits into account before anything else. Each phase is left with the `phase` tool, which refuses while the phase is incomplete or an edit is pending. When a tool refuses, apply the refusal rule of `loop`.

Rules that hold everywhere:

1. The MCP server is the only writer of `spec/`. Never edit `feature.json`, the rendered files, `.manifest.json` or `spec/README.md` with a file tool: use `create`, `patch`, `phase`, `reconcile`. The one exception is an svg file under `spec/<feature>/assets/`, which you may write before declaring it with `patch`.
2. Pass `root`, the absolute path of the project, on every call.
3. Every inner object carries a stable id. Never renumber an id; a removed id is never reused.
4. References go from the concrete object to the abstract one: a criterion names its requirement, an anchor names the requirements it realizes, a test names the criteria it verifies.
5. Everything is in English: JSON keys, the text written for the owner, the rendered documents. Requirement statements are EARS sentences with SHALL, as the schema describes.
6. Each field means what its `description` in the schema says. When in doubt, read `fields` instead of guessing.
