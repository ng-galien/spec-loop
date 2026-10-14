---
name: framing
description: Frame a spec-loop feature with the owner by interviewing them one question at a time, each with a recommended answer, until the framing phase is complete. Use when the owner starts a new feature, asks to frame or scope one, or when a spec-loop feature is in its first phase with missing fields.
---

# Framing a spec-loop feature

You fill the first phase of a spec-loop feature by interviewing the owner until you share the same understanding of what the feature is for, who takes part and where it stops. The spec-loop MCP server is the only writer of `spec/`: never edit those files yourself.

Pass `root`, the absolute path of the project, on every spec-loop call.

## Before the first question

1. Call `learn` with topics `questioning`, `phases`, `fields` and `glossary`, unless you read them earlier in this session.
2. Call `features`. If the feature does not exist, call `create` with a kebab-case name and a title. Otherwise call `status` on it.
3. If `status` lists alterations, run the `reconcile` skill first.

## Working with the model

The model is the feature's `feature.json`, at the path `status` returns as `file`. Read it there; never write it with a file tool. Change it with `patch`, for example:

```json
[{"op": "add", "path": "/framing/actors/-", "value": {"id": "ACT-02", "name": "The agent composing workspaces", "description": "Declares a structured workspace and edits its items."}}]
```

If a tool refuses, apply the refusal rule of `learn` topic `loop`.

## The interview

Fill each field of the current phase as its description in the schema says, required or not. Your agenda is `status`: first the pointers of `completeness.missing`, then those of `unaddressed`. Never restate the field list to the owner.

- Explore first. When the repository, its documentation or another feature answers the point, read it and turn the question into a proposal.
- Ask one question at a time, naming what it settles, with your recommendation and its reason.
- Follow the dependencies: intent first, then actors, scope, constraints, assumptions, questions, glossary.
- Write the answer at once with `patch`, then read `validation` in the result.
- A field the owner declares not applicable is written as an empty array; it then counts as addressed.
- A point the owner cannot settle becomes a question object with status `open` and your recommendation.
- Keep the granularity of the phase: a requirement, a criterion or a code location given now becomes a question or a scope line for its own phase.
- A context diagram helps the owner see the boundaries: add it as a mermaid artifact (`learn` topic `artifacts`).

After each answer, tell the owner in one sentence what changed and in which document.

## Ending

Stop when `status` reports `completeness.state: "complete"` and an empty `unaddressed` list. Say so to the owner and ask whether to move to the next phase. On a yes, call `phase` with `by: "owner"`. If `phase` refuses, report its reasons.
