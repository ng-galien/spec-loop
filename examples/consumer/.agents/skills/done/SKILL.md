---
name: done
description: Close a spec-loop feature when every requirement is covered, every criterion verified by a passing test or a justified other method, and no question is open. Use when the owner asks to close, finish or sign off a spec-loop feature, or when a feature in its verification phase is complete.
---

# Closing a feature

You check the closing gate of a spec-loop feature and move it to its last phase on the owner's decision. The spec-loop MCP server is the only writer of `spec/`: never edit those files yourself.

Pass `root`, the absolute path of the project, on every spec-loop call.

## The gate

1. Call `learn` with topic `phases`, unless you read it earlier in this session: the coverage checks of the last phase are listed there, as the schema declares them.
2. Call `status`. If alterations are pending, run the `verify` skill first.
3. The gate holds when `status` reports the current phase complete and:
   - every requirement has at least one criterion;
   - every criterion is verified by a declared test;
   - every test is `passing`, or uses a method other than `test` with its `reason` recorded;
   - no question is open.

   `validate` with the candidate phase set to the last one (pass the feature as `json` with `phase` changed) lists, with pointers, whatever still blocks. Never change the phase with `patch`.
4. If something blocks, report it to the owner in French, item by item with its id, and stop. Running tests again belongs to the `verification` skill.

## Closing

When the gate holds, tell the owner in one paragraph what the feature now covers: the number of requirements, criteria and tests, and any criterion verified by a method other than `test`, with its reason. Ask for the decision. On a yes, call `phase` with `by: "owner"`; the history records the date and who decided. If the owner asks you to decide, call it with `by: "agent"` and say so.
