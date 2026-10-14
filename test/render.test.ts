import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { render, renderToMemory, validate } from "../src/lib/index.js";
import { FEATURE, guineaPig, inAcceptance, inFolder, inRequirements, requirementsFixture, workspace } from "./helpers.js";

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

  it("uses fixtures that stand for the framing and requirements phases", async () => {
    expect(validate(await guineaPig())).toMatchObject({ valid: true, complete: false, phase: "framing" });
    expect(validate(await requirementsFixture())).toMatchObject({ valid: true, complete: true, phase: "requirements" });
  });

  it("lists open questions under « À trancher » and answered ones, with their answer, under « Tranché »", async () => {
    const framing = renderToMemory(await guineaPig()).find((f) => f.path === "cadrage.md")!.content;
    const open = framing.slice(framing.indexOf("## À trancher"), framing.indexOf("## Tranché"));
    expect(open).toContain("<!-- id: Q-01 -->\n### Q-01 : La création (POST)");
    expect(framing.slice(framing.indexOf("## Tranché"))).toContain("_Aucune question tranchée pour l'instant._");
    const answered = renderToMemory(await requirementsFixture()).find((f) => f.path === "cadrage.md")!.content;
    expect(answered.slice(answered.indexOf("## À trancher"), answered.indexOf("## Tranché"))).toContain("_Aucune question à trancher._");
    expect(answered.slice(answered.indexOf("## Tranché"))).toContain("<!-- id: Q-05 -->\n### Q-05 : Si l'API ne renvoie ni ETag ni champ de révision, l'écriture reste-t-elle permise ?\n\nRéponse : Recommandation retenue.");
  });

  it("opens a past phase document with one line pointing at the current phase document", async () => {
    const files = renderToMemory(await requirementsFixture());
    const cadrage = files.find((f) => f.path === "cadrage.md")!.content.split("\n");
    expect(cadrage[2]).toBe("_Document de la phase Cadrage, close ; la phase actuelle est Exigences : [exigences.md](exigences.md)._");
    expect(cadrage[4]).toBe("# Cadrage : Connecteur HTTP pour les espaces structurés de Maket");
    expect(files.find((f) => f.path === "exigences.md")!.content.split("\n")[2]).toBe("# Exigences : Connecteur HTTP pour les espaces structurés de Maket");
    expect(renderToMemory(await guineaPig()).find((f) => f.path === "cadrage.md")!.content.split("\n")[2]).toBe("# Cadrage : Connecteur HTTP pour les espaces structurés de Maket");
  });
});
