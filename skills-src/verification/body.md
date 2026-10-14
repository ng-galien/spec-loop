# Declaring and checking the tests

You declare, for each criterion of a spec-loop feature, the test that verifies it, and record whether it passes from the runner's own output. {{> preamble}} The tests live in the `repository` the owner names, or in `root` when he names none.

## Before starting

1. Call `learn` with topics `fields` and `glossary`, unless you read them earlier in this session.
2. Call `status`. Your agenda is `completeness.missing`: criteria without a test, and tests not yet passing (the closing rule is checked before leaving this phase).

{{> model}}

{{> refusal}}

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

{{> report}} In this phase that means the coverage gaps (criteria without a test, tests missing or failing, with their ids) and the command you ran.

## Ending

{{> stop}} Then ask whether to close the feature, with the `done` skill.
