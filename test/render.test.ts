import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { render, renderToMemory } from "../src/lib/index.js";
import { FEATURE, guineaPig, inAcceptance, inFolder, inRequirements, workspace } from "./helpers.js";

describe("render", () => {
  it("produces the same bytes for the same input", async () => {
    const feature = inRequirements(await guineaPig());
    const first = renderToMemory(feature);
    expect(renderToMemory(structuredClone(feature))).toEqual(first);
    expect(first.map((f) => f.path)).toEqual(["index.md", "cadrage.md", "exigences.md"]);
  });

  it("writes identical files on a second render and reports nothing changed", async () => {
    const root = await workspace();
    const first = await render(FEATURE, { root });
    const bytes = await readFile(inFolder(root, "rendered", "cadrage.md"));
    const second = await render(FEATURE, { root });
    expect(first.ok && second.ok).toBe(true);
    expect(first.files.every((f) => f.changed)).toBe(true);
    expect(second.files.every((f) => !f.changed)).toBe(true);
    expect(await readFile(inFolder(root, "rendered", "cadrage.md"))).toEqual(bytes);
  });

  it("starts each file with its source pointer and template, and heads each block with its id", async () => {
    const [index, cadrage, exigences] = renderToMemory(inRequirements(await guineaPig()));
    expect(index!.content.split("\n")[0]).toBe('<!-- source: "" template: "templates/index.hbs" -->');
    expect(cadrage!.content.split("\n")[0]).toBe('<!-- source: "/framing" template: "templates/framing.hbs" -->');
    const lines = exigences!.content.split("\n");
    expect(lines[lines.indexOf("<!-- id: REQ-002 -->") + 1]).toBe("## REQ-002");
  });

  it("renders each criterion as a Gherkin example under the rule of its requirement", async () => {
    const criteria = renderToMemory(inAcceptance(await guineaPig())).find((f) => f.path === "criteres.md")!.content;
    expect(criteria).toContain("<!-- id: REQ-002 -->\n## Règle REQ-002");
    expect(criteria).toContain(
      "<!-- id: AC-002.1 -->\n### Exemple AC-002.1 : révision périmée\n\n- **Soit** un élément de révision 3\n- **Et** l'API est à la révision 4\n- **Quand** l'agent écrit l'élément\n- **Alors** l'agent reçoit une révision périmée",
    );
  });

  it("places each artifact next to what it illustrates, and lists it in the index", async () => {
    const feature = inRequirements(await guineaPig());
    (feature.artifacts as unknown[]).push({ id: "ART-02", kind: "screen", format: "svg", title: "Écran de l'espace", path: "assets/screen.svg", illustrates: ["REQ-002"] });
    const files = renderToMemory(feature);
    const cadrage = files.find((f) => f.path === "cadrage.md")!.content;
    expect(cadrage).toMatch(/## Intention\n\n[^\n]+\n\n<!-- id: ART-01 -->\n\*\*Contexte du connecteur HTTP\*\* \(`ART-01`, contexte\)\n\n```mermaid\nflowchart LR/);
    const exigences = files.find((f) => f.path === "exigences.md")!.content;
    expect(exigences.indexOf("<!-- id: ART-02 -->")).toBeGreaterThan(exigences.indexOf("<!-- id: REQ-002 -->"));
    expect(exigences).toContain("![Écran de l'espace](../assets/screen.svg)");
    const index = files.find((f) => f.path === "index.md")!.content;
    expect(index).toContain("- ART-01 : Contexte du connecteur HTTP (contexte, mermaid), dans [cadrage.md](cadrage.md)");
    expect(index).toContain("- ART-02 : Écran de l'espace (écran, svg), dans [exigences.md](exigences.md)");
  });
});
