# Artifacts

An artifact (ART-01) is a diagram or a screen bound to what it illustrates. Artifacts are allowed in every phase and are never required by a phase.

Format rule:

- `mermaid` is the default for every flow, sequence, state, context or module diagram. Its text lives inline in `source`.
- `svg` is for screens. The file lives under `spec/<feature>/assets/` and the artifact points at it with `path`. Write the file, then declare the artifact with `patch`.
- `ascii` is a draft only. Replace it with mermaid or svg before the phase is complete; never leave an ascii artifact as the final one.

Typical moments: a `context` diagram from framing; `screen` and `flow` artifacts in requirements; `module` diagrams in anchoring.

## Screen wireframes

Wireframes live with the requirements. Every requirement of facet `interface` needs one `screen` artifact in `svg`, under `assets/`, listing that requirement in `illustrates`; the schema rule `interfaceHasScreen` reports « REQ-nnn attend sa maquette d'écran » while it is missing, and the feature cannot leave the requirements phase without it.

How to draw them:

- Black and grey line art only, no colour: strokes `#334155`, fills `#f8fafc` and `#e2e8f0`, text in the system font. Readable in both editor themes because the drawing carries its own light background.
- `viewBox` about 960 x 600. Boxes for regions, labels in French, the real field names and sample values, one visible state per element that has several (reachable, unreachable, read-only).
- No pixel-perfect styling: the wireframe fixes what is shown and where, not how it looks.

Criteria refer to the wireframe by its id when they describe what the screen shows (« Soit l'écran ART-03 … »), so a reader goes from the example to the drawing.

`illustrates` lists the requirement or criterion ids the artifact shows. The projection places the artifact right after the first of them; an artifact with no id renders in the framing document after the intent. The index lists every artifact with the document that holds it.

Owner edits: an edited mermaid or ascii source is a text hunk mapped to its ART id, reconciled like any other edit. An edited svg is reported as "artifact changed, review visually": look at it, then account for it in `reconcile` (applied if you accept the new drawing as it is, reported otherwise).

## Writing for the VS Code preview

The owner reads every projection in the VS Code built-in Markdown preview: markdown-it in CommonMark mode with tables, raw HTML sanitised, strict security. VS Code keeps the built-in preview to CommonMark on purpose: callouts are not standard Markdown and are left to extensions (microsoft/vscode#245064). Mermaid is built into VS Code (1.121 and later) and follows the light or dark theme.

Probe results (`docs/preview-probe.md`, tested by the owner on 14 October 2026):

| Construct | Bare preview | With extension |
| --- | --- | --- |
| Tables, strikethrough, code, blockquotes, headings, lists | rendered | — |
| Mermaid (flowchart, sequence, state) | rendered, theme colours | — |
| GitHub callouts `> [!NOTE]`, `[!IMPORTANT]`, `[!WARNING]` | plain blockquote starting with `[!NOTE]` | `yahyabatulu.vscode-markdown-alert` |
| Task lists `- [ ]`, `- [x]` | list line showing `[ ]` / `[x]` | `bierner.markdown-checkbox` |
| Footnotes `[^1]` | literal `[^1]` and a `[^1]: …` paragraph | `bierner.markdown-footnotes` |
| `<details>`, inline `style`, `class` | not relied on | — |

The three extensions are recommended in `.vscode/extensions.json`; VS Code proposes them when the folder is first opened.

Degradation rule: every construct that needs an extension must stay readable without it. A callout degrades to a blockquote whose first line names its kind; a checkbox degrades to a list line starting with `[ ]` or `[x]`; a footnote degrades to a marker and a paragraph next to the block it belongs to. Nothing else that needs an extension is used.

Rules for templates and for artifacts you write:

1. Meaning is never carried by colour alone. In generated diagrams the current phase is marked by its label (« Exigences ◀ actuelle ») and a distinct node shape, past phases by a plain label, next phases by dashed links. Generated diagrams carry no `classDef`; an author-written artifact may use it, but must stay readable without it.
2. CommonMark plus tables, and the three degradable extensions above: callouts (an open question is `[!IMPORTANT]`, an answered one `[!NOTE]`, a blocking state in an index `[!WARNING]`), task lists (things left to do, questions open or answered), footnotes (a textual source of a requirement; ids stay inline). No inline HTML: no `style`, `class`, badges or anchors. The only HTML is the `<!-- id: … -->` and `<!-- ptr: … -->` comments, each alone on its line, outside any blockquote or list item.
3. `<details>` is not relied on.
4. Summary tables (the requirements table, the index of features) are plain Markdown tables; links to a block target the heading slug VS Code computes.
5. Images: local files by relative path (svg under `assets/`), or https only.
6. Both themes must read well: check the file in the preview (Ctrl+Shift+V, Cmd+Shift+V on macOS) in light and dark, with and without the extensions.
