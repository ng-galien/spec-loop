# The loop

Tools: `learn`, `features`, `status`, `create`, `validate`, `render`, `diff`, `patch`, `phase`, `reconcile`. The read-only ones are `learn`, `features`, `status`, `validate`, `diff`.

spec-loop specifies; it does not implement. It keeps the model of a feature from framing to closing, and the code is written outside it: between anchoring and verification, the agent implements at the anchors with its usual development workflow (branch, edits, tests, review), then comes back to spec-loop to declare and run the tests.

1. `features` lists every feature with its phase, its completeness and a marker for pending owner edits. `status` gives the same for one feature in detail, with `file`, the path of its `feature.json`. Call `status` first whenever you work on a feature: it carries the alteration list.
2. `create` writes the skeleton of a new feature (next FEAT number, first phase) and renders it. One feature at a time: `create` refuses while any feature is not in the last phase, and names it with its phase and missing count. Finish that feature first. Only when the owner explicitly asks to open the new one anyway, call `create` with `by: "owner"` and the owner's `reason`; the new feature records it in `lifecycle.openedWhileUnfinished`.
3. You fill the model with `patch` (RFC 6902 JSON Patch). A patch is validated before it is written: `invalid` errors block it, `incomplete` errors say what the phase still needs. Every successful write re-renders the projection, the manifest and `spec/README.md`.
4. `render` projects `feature.json` into `rendered/`. Same input, same bytes. Every file starts with `<!-- source: "<JSON pointer>" template: "templates/<name>.hbs" -->`; every block starts with `<!-- id: REQ-003 -->` or `<!-- ptr: /framing/scope/in/2 -->`.
5. The owner reads the projection, then answers in the conversation (you patch) or edits the rendered files and asks you to take them into account: the `reconcile` skill (see `feedback`).
6. When `status` says the phase is complete and no owner edit is pending, ask the owner, and stop. Only on the owner's explicit yes in the conversation, call `phase` with `by: "owner"` (`"agent"` only when the owner told you to decide yourself). It refuses otherwise, and lists each missing item with its pointer. The completeness of a phase includes the entry rules of the next one (rules marked `gate: entry`, and every rule of a phase that produces nothing, such as the last), so a phase cannot be left while the next one would already be blocked. `phase`, `id`, `name` and `lifecycle` cannot be patched.
7. When the project declares hooks in `spec/spec-loop.json` (`learn` topic `project`), `phase` runs the `beforeLeave` hooks of the phase being left before a forward move, and refuses the move if one fails; it runs the `onEnter` hooks of the phase entered right after the move. Every run is recorded in `lifecycle.hookRuns`.
8. The owner may send the feature back to an earlier phase: `phase` with `to` naming that phase, `by: "owner"` and a `reason`. The history records the move and its reason, `status.lastBackwardMove` shows it, and the sections of later phases stay in the JSON; their documents are not rendered until the phase is reached again.

## Next

Every result about a feature (`create`, `status`, `patch`, `phase`, `reconcile`, and each line of `features`) carries `next`:

- `phase`: the current phase;
- `skill`: the skill to run now, the phase's own or `reconcile` while owner edits are pending;
- `instruction`: what to do now, from the schema (`x-phases[].instructions`): `onEnter` right after a phase change, `onIncomplete` while the phase is incomplete, `beforeLeave` once it is complete;
- `missing`: how many items are still missing or invalid, entry rules of the next phase included (a missing screen wireframe shows here during requirements);
- `todo`: each of them as `pointer: message`.

Follow `next.instruction` at every turn: it is the method, repeated where you will read it. It asks the owner one question at a time and stops after each; it never moves a phase forward without the owner's explicit yes in the conversation. `learn` topic `phases` lists every instruction.

## Refusal rule

When a tool refuses (`ok: false` or an error result), read `errors[].pointer` and the message, fix the operation at that pointer and call again. After two refusals of the same change, show the error to the owner as returned, and stop. Never work around a refusal by writing files yourself.

## Alterations

Each render writes `spec/<feature>/.manifest.json`: the sha256 and render time of `feature.json`, every rendered file and every svg asset. `status`, `diff` and `reconcile` compare the disk against it on every call and classify what differs:

- `rendered-changed`: the owner edited a rendered file; the normal feedback path, mapped to ids by `diff`.
- `asset-changed`: an svg changed or disappeared; review it visually, it is never reconciled automatically.
- `feature-changed`: `feature.json` was edited outside the MCP; it is revalidated at once and its schema errors are listed.
- `rendered-missing`: a rendered file was deleted.
- `rendered-extra`: a file was added by hand in `rendered/`.

Every alteration is pending until a `reconcile` accounts for it. While anything is pending, `patch` and `render` refuse to write (a hand-edited `feature.json` included, a deleted rendered file is not silently recreated) and `phase` refuses to advance. `reconcile` restores the projection exactly: files added by hand are removed, deleted ones recreated, and the owner's versions are kept under `.spec-loop/overwritten/<time>/`. Each render also keeps the last known good `feature.json` under `.spec-loop/feature.last.json`.

`status` and `features` echo the resolved project root and `spec/` path; check them when a feature seems missing. `create` needs an absolute `root`.
