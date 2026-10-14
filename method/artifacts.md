# Artifacts

An artifact (ART-01) is a diagram or a screen bound to what it illustrates. Artifacts are allowed in every phase and are never required by a phase.

Format rule:

- `mermaid` is the default for every flow, sequence, state, context or module diagram. Its text lives inline in `source`.
- `svg` is for screens. The file lives under `spec/<feature>/assets/` and the artifact points at it with `path`. Write the file, then declare the artifact with `patch`.
- `ascii` is a draft only. Replace it with mermaid or svg before the phase is complete; never leave an ascii artifact as the final one.

Typical moments: a `context` diagram from framing; `screen` and `flow` artifacts in requirements; `module` diagrams in anchoring.

`illustrates` lists the requirement or criterion ids the artifact shows. The projection places the artifact right after the first of them; an artifact with no id renders in the framing document after the intent. The index lists every artifact with the document that holds it.

Owner edits: an edited mermaid or ascii source is a text hunk mapped to its ART id, reconciled like any other edit. An edited svg is reported as "artifact changed, review visually": look at it, then account for it in `verify` (applied if you accept the new drawing as it is, reported otherwise).
