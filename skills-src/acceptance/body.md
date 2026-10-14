# Writing acceptance criteria

You give every requirement of a spec-loop feature concrete examples that show it satisfied or violated. {{> preamble}}

## Before starting

1. Call `learn` with topics `fields` and `glossary`, unless you read them earlier in this session.
2. Call `status`. If the feature is not in the acceptance phase, stop.
3. Your agenda is `completeness.missing`: each requirement without a criterion is listed there by the schema coverage rule.

{{> model}}

{{> refusal}}

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

{{> stop}} {{> report}} Then ask whether to move on; on a yes, call `phase` with `by: "owner"`.
