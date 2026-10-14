# The owner's feedback

The owner reads `spec/README.md`, then `spec/<feature>/rendered/index.md` and the documents it links, in the VS Code Markdown preview. Two ways to answer:

1. In the conversation. You turn the answer into a `patch` and show what changed in the projection.
2. By editing the rendered files (or an svg asset), then asking you to verify. You run the verification below, which the `verify` skill drives.

Verification:

1. Call `status`, then `diff`. `ownerEdits.hunks` is the number of pending items; `alterations` classifies them (see `loop`).
2. For each hunk of a `rendered-changed` file, read `lines` ('-' is the regenerated projection, '+' is the owner's file), `target` (block id and JSON pointer), `touches`, `newIds`.
3. Classify each pending item:
   - coherent: it rewords or corrects an object inside the current scope and phase without contradicting another object. Write the JSON Patch at `target.pointer`.
   - widening: it adds something outside `framing.scope.in`, contradicts `framing.scope.out`, adds an object of a later phase, or adds an id (`newIds`) that brings a new behaviour.
   - breaking: it contradicts a constraint, an answered question, a requirement or a criterion, removes an id that other objects reference, or edits a marker comment.
   - `asset-changed`: review the drawing; applied if you accept it, reported otherwise.
   - `feature-changed`: accept it if it is valid and coherent (fix schema errors with ops), report it otherwise.
   - `rendered-missing` and `rendered-extra`: applied means the projection is restored; tell the owner that notes belong in the conversation.
4. Call `verify` once with the ops for the coherent items, `applied` (their count) and `reported` (one entry per other item: file, pointer, French reason). `applied` plus the number reported must equal the pending count; `verify` refuses otherwise. It re-renders over the owner's files, keeps them under `.spec-loop/overwritten/`, and records `lifecycle.lastVerify`.
5. Report to the owner in French: what was applied (pointers and new wording), what was reported and the choice to make for each, and which documents changed.

Edits on derived parts (the "Reste à faire" list, the phase diagram, the history, the coverage table, `spec/README.md`) are not data: count them as applied (the projection is restored) and say so.
