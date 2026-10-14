---
name: acceptance
description: Write the acceptance criteria of a spec-loop feature, at least one concrete Given/When/Then example per requirement, asking the owner only about business values. Use when a spec-loop feature is in its acceptance phase, or when the owner asks for criteria, examples or acceptance of requirements.
---
<!-- Generated from skills-src/acceptance; do not edit -->

# Writing acceptance criteria

You give every requirement of a spec-loop feature concrete examples that show it satisfied or violated. The spec-loop MCP server is the only writer of `spec/`: never edit those files yourself. Pass `root`, the absolute path of the project, on every spec-loop call (`create` and `phase` refuse without it), and start from `status` on the feature: when it lists alterations or pending owner edits, run the `reconcile` skill first. Every tool result carries `next`: follow it. Its `instruction` names the skill to run and what to do now, `todo` lists what is still missing; ask the owner one question at a time, and never call `phase` forward without the owner's explicit yes in the conversation.

## Before starting

1. Call `learn` with topics `fields` and `glossary`, unless you read them earlier in this session.
2. Call `status`. If the feature is not in the acceptance phase, stop.
3. Your agenda is `completeness.missing`: each requirement without a criterion is listed there by the schema coverage rule.

## Working with the model

The model is the feature's `feature.json`, at the path `status` returns as `file`. Read it there; never write it with a file tool. Change it with `patch`, for example:

```json
[{"op": "add", "path": "/criteria/-", "value": {"id": "AC-004.1", "requirement": "REQ-004", "title": "two pages", "given": ["an API that returns two pages of 50 items"], "when": "the workspace lists its items", "then": ["the 100 items are listed"]}}]
```

If a tool refuses, apply the refusal rule of `learn` topic `loop`: fix the operation at `errors[].pointer` and call again; after two refusals of the same change, show the error to the owner as returned and stop.

## Drafting

For each requirement, in id order:

- Read its statement, its EARS pattern, its rationale, the questions it comes from, and the artifacts that illustrate it.
- Draft at least one criterion with concrete values. The id carries the requirement number (`AC-004.1`, `AC-004.2` for REQ-004). One `when` per criterion: a second action is a second criterion.
- Let the EARS pattern guide the example: `event` acts then observes; `state` sets the state first; `unwanted` injects the fault; `optional` configures the variant.
- When the same behaviour holds for several values, use the `examples` table instead of repeating criteria.
- When a criterion describes what a screen shows, name the wireframe by its id in `given` or `then`.

## Asking the owner

Ask only about what depends on business values you cannot derive: a threshold, a limit, a wording, which case matters most. One question at a time, with your recommended value and why.

## Ending

Stop when `status` reports `completeness.state: "complete"` and an empty `unaddressed` list. Report to the owner in plain sentences: what changed, with the ids it touched; what is still open or was reported, and why; and which document under `rendered/` to read. Then ask whether to move on; on a yes, call `phase` with `by: "owner"`.
