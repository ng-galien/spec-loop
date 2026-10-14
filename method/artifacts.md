# Artifacts

An artifact (ART-01) is a diagram or a screen bound to what it illustrates. Artifacts are allowed in every phase and are never required by a phase.

Format rule:

- `mermaid` is the default for every flow, sequence, state, context or module diagram. Its text lives inline in `source`.
- `svg` is for screens. The file lives under `spec/<feature>/assets/` and the artifact points at it with `path`. Write the file, then declare the artifact with `patch`.
- `ascii` is a draft only. Replace it with mermaid or svg before the phase is complete; never leave an ascii artifact as the final one.

Typical moments: a `context` diagram from framing; `screen` and `flow` artifacts in requirements; `module` diagrams in anchoring.

`illustrates` lists the requirement or criterion ids the artifact shows. The projection places the artifact right after the first of them; an artifact with no id renders in the framing document after the intent. The index lists every artifact with the document that holds it.

Owner edits: an edited mermaid or ascii source is a text hunk mapped to its ART id, reconciled like any other edit. An edited svg is reported as "artifact changed, review visually": look at it, then account for it in `verify` (applied if you accept the new drawing as it is, reported otherwise).

## Writing for the VS Code preview

The owner reads every projection in the VS Code built-in Markdown preview: markdown-it in CommonMark mode with tables, with raw HTML sanitised and strict security. Mermaid is built into VS Code (1.121 and later) and follows the light or dark theme. Rules for templates and for artifacts you write:

1. Meaning is never carried by colour alone. In generated diagrams the current phase is marked by its label (« Exigences ◀ actuelle ») and a distinct node shape, past phases by a plain label, next phases by dashed links. Generated diagrams carry no `classDef`; an author-written artifact may use it, but must stay readable without it.
2. Only CommonMark plus tables: emphasis, code spans, headings, lists, blockquotes, horizontal rules, tables. No task lists, footnotes or emoji shortcodes. No inline HTML: no `style`, `class`, badges or anchors. The only HTML is the `<!-- id: … -->` and `<!-- ptr: … -->` comments, each alone on its line, never inside a list item or a paragraph.
3. `<details>` is not relied on.
4. Summary tables (the requirements table, the index of features) are plain Markdown tables; links to a block target the heading slug VS Code computes.
5. Images: local files by relative path (svg under `assets/`), or https only.
6. Both themes must read well: check the file in the preview (Ctrl+Shift+V, Cmd+Shift+V on macOS) in light and dark.
