# spec-loop

spec-loop keeps one JSON model per feature under `spec/` and projects it into Markdown documents for the owner. The spec-loop MCP server is the only writer of `spec/`: never edit those files with a file tool.

Call the `learn` tool first (topic `index`), then `features` or `status`. Pass `root`, the absolute path of the project, on every spec-loop call. Skills, one per phase: `framing`, `requirements`, `acceptance`, `anchoring`, `verification`, `done`; and `reconcile` whenever the owner has edited the rendered files. spec-loop specifies; the code is written at the anchors, outside spec-loop, between anchoring and verification.

One feature at a time: finish the current feature before creating another one; `create` refuses otherwise, and only the owner may override it.

Every spec-loop result about a feature carries `next`: follow `next.instruction`, run the skill it names, ask the owner one question at a time, and never move a phase forward without the owner's explicit yes.
