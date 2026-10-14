---
name: acceptance
description: Write the acceptance criteria of a spec-loop feature, at least one concrete Given/When/Then example per requirement, asking the owner only about business values. Use when a spec-loop feature is in its acceptance phase, or when the owner asks for criteria, examples or acceptance of requirements.
---

# Writing acceptance criteria

You give every requirement of a spec-loop feature concrete examples that show it satisfied or violated. The spec-loop MCP server is the only writer of `spec/`: never edit those files yourself.

Pass `root`, the absolute path of the project, on every spec-loop call.

## Before starting

1. Call `learn` with topic `fields` (the criterion fields and their descriptions) and topic `glossary`, unless you read them earlier in this session.
2. Call `status`. If alterations are pending, run the `verify` skill first. If the feature is not yet in the acceptance phase, stop: the phase is advanced with `phase` once the requirements are complete.
3. Your agenda is `completeness.missing`: each requirement without a criterion is listed there by the schema coverage rule.

## Drafting

For each requirement, in id order:

- Read its statement, its EARS pattern, its rationale, the questions it comes from, and the artifacts that illustrate it (a screen wireframe tells you what the owner sees).
- Draft at least one criterion with concrete values. The id carries the requirement number (`AC-004.1`, `AC-004.2` for REQ-004). One `when` per criterion: a second action is a second criterion.
- Let the EARS pattern guide the example: `event` acts then observes; `state` sets the state first; `unwanted` injects the fault; `optional` configures the variant.
- When the same behaviour holds for several values, use the `examples` table instead of repeating criteria.
- When a criterion describes what a screen shows, name the wireframe by its id in `given` or `then`.

Write each requirement's criteria with one `patch`, then read `validation`.

## Asking the owner

Ask only about what depends on business values you cannot derive: a threshold, a limit, a wording, a date format, which case matters most. One question at a time, in French, with your recommended value and why. Everything else you draft and show.

## Ending

Stop when `status` reports the phase complete and nothing unaddressed. Tell the owner which criteria were written and where to read them (`rendered/criteres.md`), then ask whether to move on; on a yes, call `phase` with `by: "owner"`.
