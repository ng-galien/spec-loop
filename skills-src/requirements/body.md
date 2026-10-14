# Writing requirements

You turn the framing of a spec-loop feature into requirements: each one observable response of the system, stated once. {{> preamble}}

## Before starting

1. Call `learn` with topics `fields`, `glossary` and `artifacts`, unless you read them earlier in this session.
2. Call `status`. If the feature is not in the requirements phase, stop.
3. Read the framing in the model: scope lines, constraints, answered questions and their answers. Each of them is a source.

{{> model}}

{{> refusal}}

## Writing

- One EARS sentence per answer or scope line: one observable response, with SHALL, in the form its `pattern` fixes. Split a sentence that carries two responses.
- Set `facet` to the side of the system it fixes, `priority` to MUST, SHOULD or MAY, a short `title`, a `rationale` that says why, and `source` with the ids it comes from.
- Never renumber an id; a removed requirement's id is never reused.
- Every requirement of facet `interface` needs a screen wireframe: an svg under `assets/`, declared as an artifact of kind `screen` that lists the requirement in `illustrates`. Write the file, then declare it with `patch`. The phase cannot be left without it (the `interfaceHasScreen` rule, "To satisfy before leaving" in `learn` topic `phases`).
- Show the owner what you wrote, a few requirements at a time, and where to read them.

## Asking the owner

Ask only what the framing does not settle: a priority, a behaviour the answers leave open. One question at a time, with your recommendation and its reason.

## Ending

{{> stop}} {{> report}} Then ask the owner whether to move on; on a yes, call `phase` with `by: "owner"`. If `phase` refuses, report its reasons.
