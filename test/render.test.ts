import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { create, render, renderToMemory, validate } from "../src/lib/index.js";
import { headingSlug } from "../src/lib/render.js";
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
    expect(open).toContain("<!-- id: Q-01 -->\n> [!IMPORTANT]\n> **Q-01** · La création (POST) et la suppression (DELETE) font-elles partie de la première version ?\n>\n> Recommandation : Oui : POST");
    expect(framing.slice(framing.indexOf("## Tranché"))).toContain("_Aucune question tranchée pour l'instant._");
    const answered = renderToMemory(await requirementsFixture()).find((f) => f.path === "cadrage.md")!.content;
    expect(answered.slice(answered.indexOf("## À trancher"), answered.indexOf("## Tranché"))).toContain("_Aucune question à trancher._");
    expect(answered.slice(answered.indexOf("## Tranché"))).toContain("<!-- id: Q-05 -->\n> [!NOTE]\n> **Q-05** · Si l'API ne renvoie ni ETag ni champ de révision, l'écriture reste-t-elle permise ?\n>\n> Réponse : Recommandation retenue.");
  });

  it("opens a past phase document with one line pointing at the current phase document", async () => {
    const files = renderToMemory(await requirementsFixture());
    const afterNav = (content: string) => content.split("<!-- /nav -->\n\n")[1]!.split("\n");
    const cadrage = afterNav(files.find((f) => f.path === "cadrage.md")!.content);
    expect(cadrage[0]).toBe("_Document de la phase Cadrage, close ; la phase actuelle est Exigences : [exigences.md](exigences.md)._");
    expect(cadrage[2]).toBe("# Cadrage : Connecteur HTTP pour les espaces structurés de Maket");
    expect(afterNav(files.find((f) => f.path === "exigences.md")!.content)[0]).toBe("# Exigences : Connecteur HTTP pour les espaces structurés de Maket");
    expect(afterNav(renderToMemory(await guineaPig()).find((f) => f.path === "cadrage.md")!.content)[0]).toBe("# Cadrage : Connecteur HTTP pour les espaces structurés de Maket");
  });

  it("puts every id and ptr comment alone on its line, so the Markdown after it is parsed", async () => {
    const feature = inAcceptance(await guineaPig());
    feature.phase = "verification";
    feature.anchors = [{ id: "ANC-01", kind: "symbol", path: "src/http.ts", symbol: "HttpConnector.list", change: "add", realizes: ["REQ-001", "REQ-002"] }];
    feature.tests = [{ file: "test/http.test.ts", name: "AC-001.1 AC-002.1 lists and writes", framework: "vitest", verifies: ["AC-001.1", "AC-002.1"] }];
    feature.decisions = [{ id: "DEC-01", title: "Interrogation d'abord", status: "accepted", context: "c", decision: "d", consequences: "e", affects: ["REQ-001"] }];
    const files = renderToMemory(feature);
    expect(files.map((f) => f.path)).toEqual(["index.md", "cadrage.md", "exigences.md", "criteres.md", "ancrage.md", "verification.md", "decisions.md"]);
    for (const file of files) {
      expect(file.content.replace(/`[^`]*`/g, "").replace(/<!-- (id|ptr): [^ ]+ -->/g, "").replace(/^<!-- source: .* -->$/m, "").replace(/^<!-- \/?nav -->$/gm, ""), file.path).not.toMatch(/<[a-z!/]/i);
      for (const line of file.content.split("\n").filter((l) => /<!-- (id|ptr):/.test(l.replace(/`[^`]*`/g, "")))) {
        expect(line, `${file.path}: ${line}`).toMatch(/^<!-- (id: [A-Z]+-[0-9]+(\.[0-9]+)?|ptr: \/[^ ]*) -->$/);
      }
    }
    const cadrage = files.find((f) => f.path === "cadrage.md")!.content;
    expect(cadrage).toContain("<!-- id: CON-01 -->\n- **CON-01** · Le connecteur implémente l'interface ItemSource existante sans la modifier.");
    expect(cadrage).toContain("<!-- ptr: /framing/scope/in/1 -->\n- Lire un élément par son identité.");
  });

  it("opens the requirements document with a summary table linking to titled headings", async () => {
    const feature = await requirementsFixture();
    (feature.requirements as { title?: string }[])[0]!.title = "Liste par curseur";
    const exigences = renderToMemory(feature).find((f) => f.path === "exigences.md")!.content;
    expect(exigences).toContain(
      "<!-- ptr: /requirements -->\n| Exigence | Titre | Facette | Priorité | Forme EARS | Origine |\n| --- | --- | --- | --- | --- | --- |\n| [REQ-001](#req-001--liste-par-curseur) | Liste par curseur | intégration | MUST | sur événement | ACT-02 |\n| [REQ-002](#req-002) | — | comportement | MUST | comportement indésirable | CON-03 |",
    );
    expect(exigences).toContain("<!-- id: REQ-001 -->\n## REQ-001 · Liste par curseur\n");
    expect(headingSlug("REQ-003 · Écrire avec révision")).toBe("req-003--%C3%A9crire-avec-r%C3%A9vision");
    expect(validate(feature).valid).toBe(true);
  });

  it("shows the recommendation of an answered question on one line after the answer", async () => {
    const cadrage = renderToMemory(await requirementsFixture()).find((f) => f.path === "cadrage.md")!.content;
    expect(cadrage).toContain("> **Q-05** · Si l'API ne renvoie ni ETag ni champ de révision, l'écriture reste-t-elle permise ?\n>\n> Réponse : Recommandation retenue.\n>\n> _Recommandation proposée : Non : l'espace passe en lecture seule._\n>\n> Concerne : CON-03.\n");
  });

  it("marks the current phase in the index diagram by label, shape and dashed links, without colours", async () => {
    const index = renderToMemory(await requirementsFixture()).find((f) => f.path === "index.md")!.content;
    expect(index).toContain(
      '```mermaid\nflowchart LR\n  framing["Cadrage"]\n  requirements(["Exigences ◀ actuelle"])\n  acceptance["Acceptation"]\n  anchoring["Ancrage"]\n  verification["Vérification"]\n  done["Terminé"]\n  framing --> requirements\n  requirements -.-> acceptance\n  acceptance -.-> anchoring\n  anchoring -.-> verification\n  verification -.-> done\n```',
    );
    expect(index).not.toContain("classDef");
  });

  it("index: warns when the phase waits for answers, lists what is left and the questions as task lists", async () => {
    const index = renderToMemory(await guineaPig()).find((f) => f.path === "index.md")!.content;
    expect(index).toContain("> [!WARNING]\n> La phase « Cadrage » attend vos réponses : 5 question(s) ouverte(s), Q-01, Q-02, Q-03, Q-04, Q-05.");
    expect(index).toContain("- [ ] Question Q-01 à répondre : `/framing/questions/0/status`");
    expect(index).toContain("<!-- ptr: /framing/questions -->\n## Questions\n\n- [ ] Q-01 · La création (POST)");
    const done = renderToMemory(await requirementsFixture()).find((f) => f.path === "index.md")!.content;
    expect(done).not.toContain("[!WARNING]");
    expect(done).toContain("- [x] Q-05 · Si l'API ne renvoie ni ETag ni champ de révision");
  });

  it("index: warns when tests fail or are missing in the verification phase", async () => {
    const feature = inAcceptance(await guineaPig());
    feature.phase = "verification";
    feature.anchors = [{ id: "ANC-01", kind: "module", path: "src/http.ts", change: "add", realizes: ["REQ-001", "REQ-002"] }];
    feature.tests = [{ file: "t.ts", name: "AC-001.1 x", framework: "vitest", verifies: ["AC-001.1"], status: "failing" }];
    const index = renderToMemory(feature).find((f) => f.path === "index.md")!.content;
    expect(index).toContain("> [!WARNING]\n> Vérification à refaire : 1 test(s) en échec ou pas encore écrit(s).");
  });

  it("cites a textual source of a requirement as a footnote, ids inline", async () => {
    const feature = await requirementsFixture();
    (feature.requirements as { source: string[] }[])[0]!.source = ["ACT-02", "Entretien du 14 octobre avec le propriétaire"];
    const exigences = renderToMemory(feature).find((f) => f.path === "exigences.md")!.content;
    expect(exigences).toContain("Origine : ACT-02[^REQ-001-1]\n\n[^REQ-001-1]: Entretien du 14 octobre avec le propriétaire\n");
  });

  it("spec index warns about a feature with pending owner edits", async () => {
    const root = await workspace();
    await render(FEATURE, { root });
    const path = inFolder(root, "rendered", "cadrage.md");
    await writeFile(path, (await readFile(path, "utf8")).replace("sans la modifier", "sans la toucher"));
    await create("autre", "Autre", { root });
    const index = await readFile(join(root, "spec", "README.md"), "utf8");
    expect(index).toContain("> [!WARNING]\n> FEAT-001 : 1 modification(s) faite(s) hors de l'agent, à vérifier avant toute suite.");
  });

  it("opens every document with the breadcrumb, the menu of documents in phase order and a rule", async () => {
    const files = renderToMemory(await requirementsFixture());
    const cadrage = files.find((f) => f.path === "cadrage.md")!.content;
    expect(cadrage.startsWith(
      '<!-- source: "/framing" template: "templates/framing.hbs" -->\n\n<!-- nav -->\n' +
        "[Toutes les fonctionnalités](../../README.md) › [FEAT-001 · Connecteur HTTP pour les espaces structurés de Maket](index.md) › Cadrage\n\n" +
        "[Index](index.md) · **Cadrage** · [Exigences](exigences.md) · Acceptation · Ancrage · Vérification · Décisions\n\n---\n<!-- /nav -->\n\n_Document de la phase Cadrage, close",
    )).toBe(true);
    expect(cadrage.endsWith(
      "<!-- nav -->\n\n---\n\n[Toutes les fonctionnalités](../../README.md) › [FEAT-001 · Connecteur HTTP pour les espaces structurés de Maket](index.md) › Cadrage\n\n" +
        "[Index](index.md) · **Cadrage** · [Exigences](exigences.md) · Acceptation · Ancrage · Vérification · Décisions\n\n" +
        "← Précédent : [Index](index.md) · Suivant : [Exigences](exigences.md) →\n<!-- /nav -->\n",
    )).toBe(true);
    const exigences = files.find((f) => f.path === "exigences.md")!.content;
    expect(exigences).toContain("[Index](index.md) · [Cadrage](cadrage.md) · **Exigences** · Acceptation");
    expect(exigences).toContain("← Précédent : [Cadrage](cadrage.md)\n<!-- /nav -->");
    const index = files.find((f) => f.path === "index.md")!.content;
    expect(index).toContain("<!-- nav -->\n[Toutes les fonctionnalités](../../README.md) › FEAT-001 · Connecteur HTTP pour les espaces structurés de Maket\n\n---\n<!-- /nav -->");
    expect(index).toContain("Suivant : [Cadrage](cadrage.md) →\n<!-- /nav -->");
    expect(index).not.toContain("**Index**");
  });

  it("spec index lists the features by phase", async () => {
    const root = await workspace();
    await render(FEATURE, { root });
    await create("autre", "Autre", { root });
    const index = await readFile(join(root, "spec", "README.md"), "utf8");
    expect(index).toContain(
      "<!-- nav -->\n**Cadrage** : [FEAT-001 · Connecteur HTTP pour les espaces structurés de Maket](FEAT-001-maket-http-connector/rendered/index.md) · [FEAT-002 · Autre](FEAT-002-autre/rendered/index.md)\n\n**Exigences** : —",
    );
    expect(index).toContain("| Id | Fonctionnalité |");
  });
});
