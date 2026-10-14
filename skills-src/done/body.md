# Closing a feature

You check the closing gate of a spec-loop feature and move it to its last phase on the owner's decision. {{> preamble}}

## Before starting

1. Call `learn` with topic `phases`, unless you read it earlier in this session: the rules to satisfy before the last phase are listed there.
2. Call `status`.

{{> model}}

{{> refusal}}

## The gate

The gate holds when `status` reports the current phase complete: every requirement has a criterion, every criterion a declared test, every test is passing or uses another method with its reason, and no question is open. `phase` itself refuses to enter the last phase while any of these fails, and lists each blocking item with its pointer: report them as they come. Running tests again belongs to the `verification` skill.

## Closing

{{> stop}} Then tell the owner in one paragraph what the feature covers: the number of requirements, criteria and tests, and any criterion verified by a method other than `test`, with its reason. Ask for the decision. On a yes, call `phase` with `by: "owner"`; the history records the date and who decided. If the owner asks you to decide, call it with `by: "agent"` and say so.

If the owner decides that an earlier phase must be reopened, call `phase` with `to` naming that phase, `by: "owner"` and his reason. Nothing is deleted: the later sections stay in the model and come back when their phase is reached again.
