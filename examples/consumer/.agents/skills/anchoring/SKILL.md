---
name: anchoring
description: Anchor the requirements of a spec-loop feature in the code of the target repository, naming for each the file and symbol that will realise it and how it changes, without writing code. Use when a spec-loop feature is in its anchoring phase, or when the owner asks where the requirements land in the code.
---

# Anchoring requirements in the code

You find, in the repository that will carry the feature, the places that will realise each requirement. You never write or change code in this skill. The spec-loop MCP server is the only writer of `spec/`: never edit those files yourself.

Pass `root`, the absolute path of the project that holds `spec/`, on every spec-loop call. The code to read is the `repository` the owner names; when he names none, it is `root` itself. Anchor paths are relative to that repository.

## Before starting

1. Call `learn` with topic `fields` (the anchor fields) and topic `glossary`, unless you read them earlier in this session.
2. Call `status`. If alterations are pending, run the `verify` skill first. Your agenda is `completeness.missing`: every MUST requirement without an anchor is listed there.

## Exploring

For each requirement, read the code before deciding:

- Search the repository for the concepts of the requirement and its glossary terms; follow the interfaces it names (for example the interface it must implement) to their declarations and existing implementations.
- Choose the file and, when there is one, the symbol (a class, a function, a method, a route, a schema, a configuration key). Set `kind` to what the anchor points at and `change` to `add`, `modify` or `remove`.
- A file that does not exist yet is anchored with `change: add` at the path where it belongs by the repository's conventions.
- One anchor may realise several requirements: list them all in `realizes` rather than repeating the anchor.
- Write in `note`, in French, what the change is about at that place, in one or two sentences.

Write the anchors with `patch`, a few requirements at a time, then read `validation`.

## Module diagram

When the anchors span more than one module (directory or package), add a `module` artifact in mermaid that shows the modules touched and their dependencies, illustrating the requirements involved.

## Asking the owner

Ask only when two places are equally plausible for the same requirement: name both, with your recommendation and the reason. Never ask what reading the code answers.

## Ending

Stop when `status` reports the phase complete. Tell the owner what is anchored where (`rendered/ancrage.md`), then ask whether to move on; on a yes, call `phase` with `by: "owner"`.
