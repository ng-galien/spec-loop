# Use cases

## 1. Starting a feature

The owner asks for an HTTP connector. You call `features` to see what exists, then `create` with the name `maket-http-connector` and a title: the feature becomes FEAT-001 in phase `framing`. You run the `framing` skill: one question at a time with your recommended answer, the repository explored before asking. Each answer becomes a `patch`. When `status` reports the phase complete, you ask the owner whether to advance, then call `phase` with `by: "owner"`.

## 2. The owner edits a rendered file

In the framing document the owner rewords the scope line "Read an item by its identity." into "Read one item, given its identity.", and adds a new line under "Out of scope": "Server-sent events.". He asks you to take his changes into account. `status` shows two pending items. `diff` maps the first hunk to `/framing/scope/in/1`: a rewording of an existing line that covers the same thing, so it is coherent and becomes one replace op. The second hunk adds a line after `/framing/scope/out/3`: any added scope line widens the framing, so you report it and ask. You call `reconcile` with one op, `applied: 1` and one reported item; the owner's version is kept under `.spec-loop/overwritten/<time>/`, and the reported line becomes an open question.

## 3. Moving to the next phase

The framing is complete and nothing is pending. On the owner's yes you call `phase`: the feature moves to `requirements` and the history records the date and `owner`. `status` now lists `/requirements` as missing. You run the `requirements` skill: one EARS sentence per behaviour from the scope lines, constraints and answered questions, with `source` pointing back at their ids, a screen wireframe for each interface requirement, and a `flow` artifact in mermaid for the listing.
