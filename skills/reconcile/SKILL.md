---
name: reconcile
description: Reconcile the owner's edits to a spec-loop projection with its JSON model, applying the coherent ones and reporting the others. Use when the owner says they changed the rendered files and asks to check, verify or take their changes into account, or when status or features shows pending owner edits or alterations for a spec-loop feature.
---

# Reconciling the owner's edits

The owner edited files of a spec-loop projection (or an svg asset, or `feature.json` itself). You bring the JSON model back into coherence, apply what fits, and report the rest. This is not the verification phase, which is about tests. The spec-loop MCP server is the only writer of `spec/`: never edit those files yourself.

Pass `root`, the absolute path of the project, on every spec-loop call. The model is `feature.json` at the path `status` returns as `file`. If a tool refuses, apply the refusal rule of `learn` topic `loop`.

## Steps

1. Call `learn` with topic `feedback`, unless you read it earlier in this session.
2. Call `status` on the feature. Read `alterations` and `ownerEdits`. If nothing is pending, say so and stop.
3. Call `diff`. For each pending item, read its class (`alterations[].kind`) and, for rendered files, every hunk: the lines, `target.id`, `target.pointer`, `touches`, `newIds`. A hunk with no id and no pointer is in the navigation or another derived part: count it as applied.
4. Classify each item as the `feedback` topic says: coherent, widening, breaking. An svg change is reviewed visually. A `feature.json` changed outside the MCP is either accepted (valid, coherent, and `phase`, `id`, `name`, `lifecycle` untouched) or restored from the last known good copy; pass that choice as `featureChange` with a reason.
5. For the coherent items, write JSON Patch operations at their pointers, for example `[{"op": "replace", "path": "/framing/scope/in/1", "value": "Read an item by its identity or its URL."}]`. Keep ids unchanged.
6. Call `reconcile` once with `ops`, `applied` (the number of items you bring in or accept), `reported` (one entry per other item, with its file, pointer and reason) and, when `feature.json` was changed by hand, `featureChange`. `applied` plus the number reported must equal `ownerEdits.hunks`. Each reported item becomes an open question in the framing, so the phase cannot advance until the owner answers it.
7. Report to the owner:
   - what was applied: each pointer with its new wording;
   - what was reported: the quoted edit, the object it targets, why it widens the scope or breaks coherence, and the id of the question created for it;
   - which documents were re-rendered, and that the owner's previous files are kept under `.spec-loop/overwritten/<time>/`.

Never advance the phase in this skill. Once the owner answers a question created here, apply the answer with `patch` and mark the question answered.
