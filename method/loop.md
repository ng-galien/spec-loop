# The loop

Tools: `learn`, `features`, `status`, `create`, `validate`, `render`, `diff`, `patch`, `phase`, `verify`. The read-only ones are `learn`, `features`, `status`, `validate`, `diff`.

1. `features` lists every feature with its phase, its completeness and a marker for pending owner edits. `status` gives the same for one feature in detail. Call `status` first whenever you work on a feature: it carries the alteration list.
2. `create` writes the skeleton of a new feature (next FEAT number, first phase) and renders it.
3. You fill the model with `patch` (RFC 6902 JSON Patch). A patch is validated before it is written: `invalid` errors block it, `incomplete` errors say what the phase still needs. Every successful write re-renders the projection, the manifest and `spec/README.md`.
4. `render` projects `feature.json` into `rendered/`. Same input, same bytes. Every file starts with `<!-- source: "<JSON pointer>" template: "templates/<name>.hbs" -->`; every block starts with `<!-- id: REQ-003 -->` or `<!-- ptr: /framing/scope/in/2 -->`.
5. The owner reads the projection, then answers in the conversation (you patch) or edits the rendered files and asks you to verify (see `feedback`).
6. When `status` says the phase is complete and no owner edit is pending, and the owner agrees, call `phase` with `by: "owner"` (or `"agent"` when you decided). It refuses, with the reasons, otherwise. `phase`, `id`, `name` and `lifecycle` cannot be patched.

Alterations. Each render writes `spec/<feature>/.manifest.json`: the sha256 and render time of `feature.json`, every rendered file and every svg asset. `status`, `diff` and `verify` compare the disk against it on every call and classify what differs:

- `rendered-changed`: the owner edited a rendered file; the normal feedback path, mapped to ids by `diff`.
- `asset-changed`: an svg changed or disappeared; review it visually, it is never reconciled automatically.
- `feature-changed`: `feature.json` was edited outside the MCP; it is revalidated at once and its schema errors are listed.
- `rendered-missing`: a rendered file was deleted.
- `rendered-extra`: a file was added by hand in `rendered/`.

Every alteration is pending until a `verify` accounts for it. While anything is pending, `patch` and `render` refuse to overwrite the owner's files and `phase` refuses to advance.
