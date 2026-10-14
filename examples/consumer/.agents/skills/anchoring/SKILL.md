---
name: anchoring
description: Anchor the requirements of a spec-loop feature in the code of the target repository, naming for each the file and symbol that will realise it and how it changes, without writing code. Use when a spec-loop feature is in its anchoring phase, or when the owner asks where the requirements land in the code.
---
<!-- Generated from skills-src/anchoring; do not edit -->

# Anchoring requirements in the code

You find, in the repository that will carry the feature, the places that will realise each requirement. You never write or change code in this skill: spec-loop specifies, it does not implement. The spec-loop MCP server is the only writer of `spec/`: never edit those files yourself. Pass `root`, the absolute path of the project, on every spec-loop call, and start from `status` on the feature: when it lists alterations or pending owner edits, run the `reconcile` skill first. Every tool result carries `next`: follow it. Its `instruction` names the skill to run and what to do now, `todo` lists what is still missing; ask the owner one question at a time, and never call `phase` forward without the owner's explicit yes in the conversation. The code to read is the `repository` the owner names; when he names none, it is `root` itself. Anchor paths are relative to that repository.

## Before starting

1. Call `learn` with topics `fields` and `glossary`, unless you read them earlier in this session.
2. Call `status`. Your agenda is `completeness.missing`: every MUST requirement without an anchor is listed there.

## Working with the model

The model is the feature's `feature.json`, at the path `status` returns as `file`. Read it there; never write it with a file tool. Change it with `patch`, for example:

```json
[{"op": "add", "path": "/anchors/-", "value": {"id": "ANC-01", "kind": "symbol", "path": "src/connectors/http.ts", "symbol": "HttpConnector.list", "change": "add", "realizes": ["REQ-004", "REQ-005"], "note": "New ItemSource implementation over REST."}}]
```

If a tool refuses, apply the refusal rule of `learn` topic `loop`: fix the operation at `errors[].pointer` and call again; after two refusals of the same change, show the error to the owner as returned and stop.

## Exploring

For each requirement, read the code before deciding:

- Search the repository for the concepts of the requirement and its glossary terms; follow the interfaces it names to their declarations and existing implementations.
- Choose the file and, when there is one, the symbol. Set `kind` to what the anchor points at and `change` to `add`, `modify` or `remove`.
- A file that does not exist yet is anchored with `change: add` at the path where it belongs by the repository's conventions.
- One anchor may realise several requirements: list them all in `realizes`.
- Write in `note` what the change is about at that place, in one or two sentences.

When the anchors span more than one module, add a `module` artifact in mermaid that shows the modules touched and their dependencies.

## Asking the owner

Ask only when two places are equally plausible for the same requirement: name both, with your recommendation and the reason. Never ask what reading the code answers.

## Ending

Stop when `status` reports `completeness.state: "complete"` and an empty `unaddressed` list. Report to the owner in plain sentences: what changed, with the ids it touched; what is still open or was reported, and why; and which document under `rendered/` to read. Then ask whether to move on; on a yes, call `phase` with `by: "owner"`. The implementation at the anchors happens next, outside spec-loop, with the usual development workflow.
