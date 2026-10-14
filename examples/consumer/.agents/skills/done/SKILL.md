---
name: done
description: Close a spec-loop feature when every requirement is covered, every criterion verified by a passing test or a justified other method, and no question is open. Use when the owner asks to close, finish or sign off a spec-loop feature, or when a feature in its verification phase is complete.
---
<!-- Generated from skills-src/done; do not edit -->

# Closing a feature

You check the closing gate of a spec-loop feature and move it to its last phase on the owner's decision. The spec-loop MCP server is the only writer of `spec/`: never edit those files yourself. Pass `root`, the absolute path of the project, on every spec-loop call, and start from `status` on the feature: when it lists alterations or pending owner edits, run the `reconcile` skill first.

## Before starting

1. Call `learn` with topic `phases`, unless you read it earlier in this session: the rules to satisfy before the last phase are listed there.
2. Call `status`.

## Working with the model

The model is the feature's `feature.json`, at the path `status` returns as `file`. Read it there; never write it with a file tool. Change it with `patch`, for example:

```json
[{"op": "add", "path": "/tests/5/reason", "value": "The screen layout is checked by eye against the wireframe ART-03."}]
```

If a tool refuses, apply the refusal rule of `learn` topic `loop`: fix the operation at `errors[].pointer` and call again; after two refusals of the same change, show the error to the owner as returned and stop.

## The gate

The gate holds when `status` reports the current phase complete: every requirement has a criterion, every criterion a declared test, every test is passing or uses another method with its reason, and no question is open. `phase` itself refuses to enter the last phase while any of these fails, and lists each blocking item with its pointer: report them as they come. Running tests again belongs to the `verification` skill.

## Closing

Stop when `status` reports `completeness.state: "complete"` and an empty `unaddressed` list. Then tell the owner in one paragraph what the feature covers: the number of requirements, criteria and tests, and any criterion verified by a method other than `test`, with its reason. Ask for the decision. On a yes, call `phase` with `by: "owner"`; the history records the date and who decided. If the owner asks you to decide, call it with `by: "agent"` and say so.

If the owner decides that an earlier phase must be reopened, call `phase` with `to` naming that phase, `by: "owner"` and his reason. Nothing is deleted: the later sections stay in the model and come back when their phase is reached again.
