---
name: verification
description: Bind every acceptance criterion of a spec-loop feature to the test that verifies it, then record each test's status from one run of the named test files. Use when a spec-loop feature is in its verification phase, or when the owner asks which tests verify the criteria or whether they pass.
---

# Declaring and checking the tests

You declare, for each criterion of a spec-loop feature, the test that verifies it, and you record whether it passes from the runner's own output. The spec-loop MCP server is the only writer of `spec/`: never edit those files yourself.

Pass `root`, the absolute path of the project, on every spec-loop call. The tests live in the `repository` the owner names, or in `root` when he names none.

## Before starting

1. Call `learn` with topic `fields` (the test fields) and topic `glossary`, unless you read them earlier in this session.
2. Call `status`. If alterations are pending, run the `verify` skill first. Your agenda is `completeness.missing`: every criterion without a test is listed there.

## Declaring

For each criterion:

- Find the existing test that checks it, or decide the file and name of the test to write. The name starts with the criterion id (`AC-004.2 …`; for pytest `test_ac_004_2_…`) and contains every criterion id the test verifies.
- Set `framework`, `level` and `method`. The method is `test` unless the criterion cannot be automated; then `inspection`, `demonstration` or `analysis`, with its `reason` in French.
- A test that does not exist yet has `status: "missing"`.

Write the tests with `patch`, then read `validation`.

## Running

When the repository has a test runner and the tests exist:

- Run only the test files named in the declared tests, each once. Never run a whole suite.
- Write `status` as `passing` or `failing` for each declared test from the runner's output of that run, with `patch`. Never write a status from memory or from an earlier run.
- A test the runner does not report keeps `missing`, and you say so.

## Reporting

Report to the owner in French:

- the coverage gaps: criteria without a test, tests still missing, tests failing, with their ids;
- what was run, with the command;
- where to read it (`rendered/verification.md`).

Stop when `status` reports the phase complete. Then ask whether to close the feature, with the `done` skill.
