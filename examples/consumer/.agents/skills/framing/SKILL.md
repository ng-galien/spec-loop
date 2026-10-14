---
name: framing
description: Frame a spec-loop feature with the owner by interviewing them one question at a time, each with a recommended answer, until the framing phase is complete. Use when the owner starts a new feature, asks to frame or scope one, or when a spec-loop feature is in its first phase with missing fields.
---

# Framing a spec-loop feature

You fill the first phase of a spec-loop feature by interviewing the owner relentlessly until you share the same understanding of what the feature is for, who takes part and where it stops. The spec-loop MCP server is the only writer of `spec/`: never edit those files yourself.

Pass `root`, the absolute path of the project, on every spec-loop call.

## Before the first question

1. Call `learn` with topic `questioning`, then with topic `phases`, unless you read them earlier in this session.
2. Call `features`. If the feature does not exist, call `create` with a kebab-case name and a French title. Otherwise call `status` on it.
3. If `status` lists alterations, stop and run the `verify` skill first.

## The interview

Fill each field of the current phase as its description in the schema says (`learn` topic `fields`). Ask one question per field, with a recommended answer. Never restate the field list to the owner: ask about the next missing pointer from `status`.

For every question:

- Explore first. When the repository, its documentation or another feature answers the point, read it and turn the question into a proposal ("Je propose …, d'accord ?").
- Ask one question only, in French, naming what it settles, with your recommendation and its reason.
- Follow the dependencies: intent first, then actors, scope, constraints, assumptions, glossary. When an answer opens a branch, resolve it before moving on.
- Write the answer at once with `patch`, then read `validation` in the result. If a patch is refused, fix the operation; never write the file another way.
- A point the owner cannot settle becomes a question object with status `open` and your recommendation.
- Keep the granularity of the phase. A requirement, a criterion or a code location given now is noted as a question or a scope line for its own phase.
- A context diagram helps the owner see the boundaries: add it as a mermaid artifact (`learn` topic `artifacts`).

After each answer, tell the owner in one sentence what changed and in which document (`rendered/cadrage.md`).

## Ending

Stop when `status` reports `completeness.state: "complete"` and no owner edit is pending. Say so to the owner and ask whether to move to the next phase. On a yes, call `phase` with `by: "owner"`. If `phase` refuses, report its reasons.
