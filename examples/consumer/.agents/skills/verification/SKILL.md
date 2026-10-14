---
name: verification
description: Bind every acceptance criterion of a spec-loop feature to the test that verifies it, write a missing test at its declared place, and record each status from one run of the named test files. Use when a spec-loop feature is in its verification phase, or when the owner asks which tests verify the criteria or whether they pass.
---
<!-- Generated from skills-src/verification; do not edit -->

# Declaring and checking the tests

You declare, for each criterion of a spec-loop feature, the test that verifies it, and record whether it passes from the runner's own output. The spec-loop MCP server is the only writer of `spec/`: never edit those files yourself. Pass `root`, the absolute path of the project, on every spec-loop call, and start from `status` on the feature: when it lists alterations or pending owner edits, run the `reconcile` skill first. The tests live in the `repository` the owner names, or in `root` when he names none.

## Before starting

1. Call `learn` with topics `fields` and `glossary`, unless you read them earlier in this session.
2. Call `status`. Your agenda is `completeness.missing`: criteria without a test, and tests not yet passing (the closing rule is checked before leaving this phase).

## Working with the model

The model is the feature's `feature.json`, at the path `status` returns as `file`. Read it there; never write it with a file tool. Change it with `patch`, for example:

```json
[{"op": "add", "path": "/tests/-", "value": {"file": "test/http-connector.test.ts", "name": "AC-004.1 lists two pages", "framework": "vitest", "level": "integration", "method": "test", "verifies": ["AC-004.1"], "status": "missing"}}]
```

If a tool refuses, apply the refusal rule of `learn` topic `loop`: fix the operation at `errors[].pointer` and call again; after two refusals of the same change, show the error to the owner as returned and stop.

## Declaring

For each criterion:

- Find the existing test that checks it, or decide the file and name of the test to write. The name starts with the criterion id (`AC-004.2 …`; for pytest `test_ac_004_2_…`) and contains every criterion id the test verifies.
- Set `framework`, `level` and `method`. The method is `test` unless the criterion cannot be automated; then `inspection`, `demonstration` or `analysis`, with its `reason`.
- A test that does not exist yet has `status: "missing"`.

## Writing a missing test

spec-loop specifies, it does not implement: the code at the anchors is written with the usual development workflow. When a declared test is missing, write it at its declared file and with its declared name, from the criterion's given, when and then. If the code it needs does not exist yet, implement it first at the anchors, outside spec-loop.

## Running

- Run only the test files named in the declared tests, each once. Never run a whole suite.
- Write `status` as `passing` or `failing` for each declared test from the runner's output of that run, with `patch` (`{"op": "replace", "path": "/tests/3/status", "value": "passing"}`). Never write a status from memory or from an earlier run.
- A test the runner does not report keeps `missing`, and you say so.

## Reporting

Report to the owner in plain sentences: what changed, with the ids it touched; what is still open or was reported, and why; and which document under `rendered/` to read. In this phase that means the coverage gaps (criteria without a test, tests missing or failing, with their ids) and the command you ran.

## Ending

Stop when `status` reports `completeness.state: "complete"` and an empty `unaddressed` list. Then ask whether to close the feature, with the `done` skill.
