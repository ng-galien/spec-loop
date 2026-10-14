# Project file

A project can enrich the base loop with one file, `spec/spec-loop.json`, written by the project's owner (not by the MCP server). It is validated against `schema/project.schema.json`. It can only add to the loop: commands run around phase moves, and sentences appended to the schema's instructions. It never removes a phase, a rule or an instruction.

```json
{
  "hooks": [
    { "phase": "verification", "on": "beforeLeave", "run": "npm test", "timeout": 300, "title": "Unit tests" }
  ],
  "instructions": {
    "requirements": { "beforeLeave": "Check every interface requirement against docs/ui.md." }
  }
}
```

## Hooks

Each hook names a `phase` of the schema, a moment `on`, a shell command `run`, an optional `timeout` in seconds (120 by default) and an optional `title` (the command by default).

- `on: "beforeLeave"`: the `phase` tool runs the hook before a forward move out of that phase, once the phase is complete and no owner edit is pending. Any exit code other than 0, or a timeout, blocks the move, and `reasons` names the hook with the last line of its output. The move happens only when every such hook passed.
- `on: "onEnter"`: the `phase` tool runs the hook right after the phase is entered, forward or back. A failure does not undo the move; it is recorded and `next.instruction` starts with it.

The server runs each command through the shell, with the project root as working directory, and captures stdout and stderr together, cut to their last 4000 characters. Every run is recorded in `lifecycle.hookRuns` of the feature (phase, moment, title, command, date, exit code, duration, output), which no patch can change. `status.hooks` gives the last run of each declared hook, the `phase` result lists in `hooks` what ran in that call, and `rendered/verification.md` shows every run in a "Project hooks" table once the feature reaches verification.

## Instructions

`instructions` maps a phase to an `onEnter` and a `beforeLeave` sentence. They are appended, after "Project:", to the schema's instruction of the same moment in `next.instruction`. `beforeLeave` instructions also name the hooks that `phase` will run.

## Errors

When the file is not valid JSON, does not match its schema or names an unknown phase, every `phase` move is refused with the error, and `next.instruction` asks you to tell the owner. You never fix the file yourself unless the owner asks.

## Security

The commands come only from the project's own file, which belongs to the project's owner, like a `package.json` script. spec-loop runs nothing from any other source: no remote configuration, nothing from feature content or owner edits. Review `spec/spec-loop.json` like any other script before running the server on a project you did not write.
