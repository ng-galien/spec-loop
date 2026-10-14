---
name: requirements
description: Write the requirements of a spec-loop feature, one EARS sentence per behaviour with its facet, priority, title, rationale and source, and a screen wireframe for every interface requirement. Use when a spec-loop feature is in its requirements phase, or when the owner asks to state, list or change requirements.
---

# Writing requirements

You turn the framing of a spec-loop feature into requirements: each one observable response of the system, stated once. The spec-loop MCP server is the only writer of `spec/`: never edit those files yourself.

Pass `root`, the absolute path of the project, on every spec-loop call.

## Before starting

1. Call `learn` with topics `fields`, `glossary` and `artifacts`, unless you read them earlier in this session.
2. Call `status`. If alterations are pending, run the `reconcile` skill first. If the feature is not in the requirements phase, stop.
3. Read the framing in the model: scope lines, constraints, answered questions and their answers. Each of them is a source.

## Working with the model

The model is the feature's `feature.json`, at the path `status` returns as `file`. Read it there; never write it with a file tool. Change it with `patch`, for example:

```json
[{"op": "add", "path": "/requirements/-", "value": {"id": "REQ-004", "title": "Cursor listing", "pattern": "event", "facet": "integration", "statement": "When the workspace asks for a batch of items, the connector SHALL call the list endpoint with the cursor of the API.", "priority": "MUST", "rationale": "Cursor listing is the basis of ItemSource.", "source": ["ACT-02"]}}]
```

If a tool refuses, apply the refusal rule of `learn` topic `loop`.

## Writing

- One EARS sentence per answer or scope line: one observable response, with SHALL, in the form its `pattern` fixes. Split a sentence that carries two responses.
- Set `facet` to the side of the system it fixes, `priority` to MUST, SHOULD or MAY, a short `title`, a `rationale` that says why, and `source` with the ids it comes from.
- Never renumber an id; a removed requirement's id is never reused.
- Every requirement of facet `interface` needs a screen wireframe: an svg under `assets/`, declared as an artifact of kind `screen` that lists the requirement in `illustrates`. Write the file, then declare it with `patch`. The phase cannot be left without it (the `interfaceHasScreen` rule, « À satisfaire pour sortir » in `learn` topic `phases`).
- Show the owner what you wrote, a few requirements at a time, and where to read them.

## Asking the owner

Ask only what the framing does not settle: a priority, a behaviour the answers leave open. One question at a time, with your recommendation and its reason.

## Ending

Stop when `status` reports `completeness.state: "complete"` and an empty `unaddressed` list. Ask the owner whether to move on; on a yes, call `phase` with `by: "owner"`. If `phase` refuses, report its reasons.
