# spec-loop

spec-loop keeps one JSON model per feature under `spec/` and projects it into French Markdown for the owner. The spec-loop MCP server is the only writer of `spec/`: never edit those files with a file tool.

Call the `learn` tool first (topic `index`), then `features` or `status`. Pass `root`, the absolute path of the project, on every spec-loop call. Skills: `framing` to frame a feature with the owner, `verify` when the owner has edited the rendered files.
