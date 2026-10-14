---
name: verify
description: Reconcile the owner's edits to a spec-loop projection with its JSON model. Use when the owner says they changed the rendered files, asks to check or verify their changes, or when status or features shows pending owner edits or alterations for a spec-loop feature.
---

# Verifying the owner's edits

The owner edited files of a spec-loop projection (or an svg asset, or `feature.json` itself). You bring the JSON model back into coherence, apply what fits, and report the rest. The spec-loop MCP server is the only writer of `spec/`: never edit those files yourself.

Pass `root`, the absolute path of the project, on every spec-loop call.

## Steps

1. Call `learn` with topic `feedback`, unless you read it earlier in this session.
2. Call `status` on the feature. Read `alterations` and `ownerEdits`. If nothing is pending, say so and stop.
3. Call `diff`. For each pending item, read its class (`alterations[].kind`) and, for rendered files, every hunk: the lines, `target.id`, `target.pointer`, `touches`, `newIds`.
4. Classify each item as the `feedback` topic says: coherent, widening, breaking; an svg change is reviewed visually; a `feature.json` changed outside the MCP is revalidated and accepted only if valid and coherent.
5. For the coherent items, write JSON Patch operations at their pointers, in the field meanings of the schema (`learn` topic `fields`). Keep ids unchanged.
6. Call `verify` once with `ops`, `applied` (the number of items you bring in or accept) and `reported` (one entry per other item, with its file, pointer and a French reason). `applied` plus the number reported must equal `ownerEdits.hunks`. If `verify` refuses, read its errors, fix the ops or the counts, and call it again.
7. Report to the owner in French:
   - what was applied: each pointer with its new wording;
   - what was reported: the quoted edit, the object it targets, why it widens the scope or breaks coherence, and the decision you need;
   - which documents were re-rendered, and that the owner's previous files are kept under `.spec-loop/overwritten/`.

Never advance the phase in this skill. A reported item becomes a decision for the owner; once they answer, apply it with `patch`.
