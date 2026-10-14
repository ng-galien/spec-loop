# Use cases

## 1. Starting a feature

The owner asks for an HTTP connector. You call `features` to see what exists, then `create` with the name `maket-http-connector` and a French title: the feature becomes FEAT-001 in phase `framing`. You run the `framing` skill: one question at a time with your recommended answer, the repository explored before asking. Each answer becomes a `patch`. When `status` reports the phase complete, you ask the owner whether to advance, then call `phase` with `by: "owner"`.

## 2. The owner edits a rendered file

In `cadrage.md` the owner changes "Lire un élément par son identité." into "Lire un élément par son identité ou par son URL.", and adds under "Hors périmètre" the words "ni SSE". He asks you to verify. `status` shows two pending items. `diff` maps the first hunk to `/framing/scope/in/1` (coherent: one replace op) and the second to `/framing/scope/out/1` (a new exclusion: it changes where the feature stops, so you report it and ask). `verify` with one op, `applied: 1` and one reported item; the owner's version is kept under `.spec-loop/overwritten/cadrage.md`.

## 3. Moving to the next phase

The framing is complete and nothing is pending. On the owner's yes you call `phase`: the feature moves to `requirements` and the history records the date and `owner`. `status` now lists `/requirements` as missing. You write one EARS sentence per behaviour from the scope lines, constraints and answered questions, with `source` pointing back at their ids, and a `flow` artifact in mermaid for the listing. The owner reads `exigences.md`.
