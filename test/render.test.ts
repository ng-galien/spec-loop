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
    expect(first.map((f) => f.path)).toEqual(["index.md", "framing.md", "requirements.md"]);
  });

  it("writes identical files on a second render and reports nothing changed", async () => {
    const root = await workspace();
    const first = await render(FEATURE, { root });
    const bytes = await readFile(inFolder(root, "rendered", "framing.md"));
    const second = await render(FEATURE, { root });
    expect(first.ok && second.ok).toBe(true);
    expect(first.files.every((f) => f.changed)).toBe(true);
    expect(second.files.every((f) => !f.changed)).toBe(true);
    expect(await readFile(inFolder(root, "rendered", "framing.md"))).toEqual(bytes);
  });

  it("starts each file with its source pointer and template, and heads each block with its id", async () => {
    const [index, cadrage, exigences] = renderToMemory(inRequirements(await guineaPig()));
    expect(index!.content.split("\n")[0]).toBe('<!-- source: "" template: "templates/index.hbs" -->');
    expect(cadrage!.content.split("\n")[0]).toBe('<!-- source: "/framing" template: "templates/framing.hbs" -->');
    const lines = exigences!.content.split("\n");
    expect(lines[lines.indexOf("<!-- id: REQ-002 -->") + 1]).toBe("## REQ-002");
  });

  it("renders each criterion as a Gherkin example under the rule of its requirement", async () => {
    const criteria = renderToMemory(inAcceptance(await guineaPig())).find((f) => f.path === "criteria.md")!.content;
    expect(criteria).toContain("<!-- id: REQ-002 -->\n## Rule REQ-002");
    expect(criteria).toContain(
      "<!-- id: AC-002.1 -->\n### Example AC-002.1: stale revision\n\n- **Given** an item at revision 3\n- **And** the API is at revision 4\n- **When** the agent writes the item\n- **Then** the agent receives a stale revision",
    );
  });

  it("places each artifact next to what it illustrates, and lists it in the index", async () => {
    const feature = inRequirements(await guineaPig());
    (feature.artifacts as unknown[]).push({ id: "ART-02", kind: "screen", format: "svg", title: "Workspace screen", path: "assets/screen.svg", illustrates: ["REQ-002"] });
    const files = renderToMemory(feature);
    const cadrage = files.find((f) => f.path === "framing.md")!.content;
    expect(cadrage).toMatch(/## Intent\n\n[^\n]+\n\n<!-- id: ART-01 -->\n\*\*HTTP connector context\*\* \(`ART-01`, context\)\n\n```mermaid\nflowchart LR/);
    const exigences = files.find((f) => f.path === "requirements.md")!.content;
    expect(exigences.indexOf("<!-- id: ART-02 -->")).toBeGreaterThan(exigences.indexOf("<!-- id: REQ-002 -->"));
    expect(exigences).toContain("![Workspace screen](../assets/screen.svg)");
    const index = files.find((f) => f.path === "index.md")!.content;
    expect(index).toContain("- ART-01: HTTP connector context (context, mermaid), in [framing.md](framing.md)");
    expect(index).toContain("- ART-02: Workspace screen (screen, svg), in [requirements.md](requirements.md)");
  });

  it("uses fixtures that stand for the framing and requirements phases", async () => {
    expect(validate(await guineaPig())).toMatchObject({ valid: true, complete: false, phase: "framing" });
    expect(validate(await requirementsFixture())).toMatchObject({ valid: true, complete: true, phase: "requirements" });
  });

  it("lists open questions apart from answered ones, which show their answer", async () => {
    const framing = renderToMemory(await guineaPig()).find((f) => f.path === "framing.md")!.content;
    const open = framing.slice(framing.indexOf("## Open questions"), framing.indexOf("## Answered questions"));
    expect(open).toContain("<!-- id: Q-01 -->\n> [!IMPORTANT]\n> **Q-01** · Are creation (POST) and deletion (DELETE) part of the first version?\n>\n> Recommendation: Yes: POST");
    expect(framing.slice(framing.indexOf("## Answered questions"))).toContain("_No answered question yet._");
    const answered = renderToMemory(await requirementsFixture()).find((f) => f.path === "framing.md")!.content;
    expect(answered.slice(answered.indexOf("## Open questions"), answered.indexOf("## Answered questions"))).toContain("_No open question._");
    expect(answered.slice(answered.indexOf("## Answered questions"))).toContain("<!-- id: Q-05 -->\n> [!NOTE]\n> **Q-05** · If the API returns neither an ETag nor a revision field, is writing still allowed?\n>\n> Answer: Recommendation accepted.");
  });

  it("opens a past phase document with one line pointing at the current phase document", async () => {
    const files = renderToMemory(await requirementsFixture());
    const afterNav = (content: string) => content.split("<!-- /nav -->\n\n")[1]!.split("\n");
    const cadrage = afterNav(files.find((f) => f.path === "framing.md")!.content);
    expect(cadrage[0]).toBe("_Document of the closed Framing phase; the current phase is Requirements: [requirements.md](requirements.md)._");
    expect(cadrage[2]).toBe("# Framing: HTTP connector for Maket structured workspaces");
    expect(afterNav(files.find((f) => f.path === "requirements.md")!.content)[0]).toBe("# Requirements: HTTP connector for Maket structured workspaces");
    expect(afterNav(renderToMemory(await guineaPig()).find((f) => f.path === "framing.md")!.content)[0]).toBe("# Framing: HTTP connector for Maket structured workspaces");
  });

  it("puts every id and ptr comment alone on its line, so the Markdown after it is parsed", async () => {
    const feature = inAcceptance(await guineaPig());
    feature.phase = "verification";
    feature.anchors = [{ id: "ANC-01", kind: "symbol", path: "src/http.ts", symbol: "HttpConnector.list", change: "add", realizes: ["REQ-001", "REQ-002"] }];
    feature.tests = [{ file: "test/http.test.ts", name: "AC-001.1 AC-002.1 lists and writes", framework: "vitest", verifies: ["AC-001.1", "AC-002.1"] }];
    feature.decisions = [{ id: "DEC-01", title: "Interrogation d'abord", status: "accepted", context: "c", decision: "d", consequences: "e", affects: ["REQ-001"] }];
    const files = renderToMemory(feature);
    expect(files.map((f) => f.path)).toEqual(["index.md", "framing.md", "requirements.md", "criteria.md", "anchors.md", "verification.md", "decisions.md"]);
    for (const file of files) {
      expect(file.content.replace(/`[^`]*`/g, "").replace(/<!-- (id|ptr): [^ ]+ -->/g, "").replace(/^<!-- source: .* -->$/m, "").replace(/^<!-- \/?nav -->$/gm, ""), file.path).not.toMatch(/<[a-z!/]/i);
      for (const line of file.content.split("\n").filter((l) => /<!-- (id|ptr):/.test(l.replace(/`[^`]*`/g, "")))) {
        expect(line, `${file.path}: ${line}`).toMatch(/^<!-- (id: [A-Z]+-[0-9]+(\.[0-9]+)?|ptr: \/[^ ]*) -->$/);
      }
    }
    const cadrage = files.find((f) => f.path === "framing.md")!.content;
    expect(cadrage).toContain("<!-- id: CON-01 -->\n- **CON-01** · The connector implements the existing ItemSource interface without changing it.");
    expect(cadrage).toContain("<!-- ptr: /framing/scope/in/1 -->\n- Read an item by its identity.");
  });

  it("opens the requirements document with a summary table linking to titled headings", async () => {
    const feature = await requirementsFixture();
    (feature.requirements as { title?: string }[])[0]!.title = "Cursor listing";
    const exigences = renderToMemory(feature).find((f) => f.path === "requirements.md")!.content;
    expect(exigences).toContain(
      "<!-- ptr: /requirements -->\n| Requirement | Title | Facet | Priority | EARS pattern | Source |\n| --- | --- | --- | --- | --- | --- |\n| [REQ-001](#req-001--cursor-listing) | Cursor listing | integration | MUST | event-driven | ACT-02 |\n| [REQ-002](#req-002) | — | behaviour | MUST | unwanted behaviour | CON-03 |",
    );
    expect(exigences).toContain("<!-- id: REQ-001 -->\n## REQ-001 · Cursor listing\n");
    expect(headingSlug("REQ-003 · Écrire avec révision")).toBe("req-003--%C3%A9crire-avec-r%C3%A9vision");
    expect(validate(feature).valid).toBe(true);
  });

  it("shows the recommendation of an answered question on one line after the answer", async () => {
    const cadrage = renderToMemory(await requirementsFixture()).find((f) => f.path === "framing.md")!.content;
    expect(cadrage).toContain("> **Q-05** · If the API returns neither an ETag nor a revision field, is writing still allowed?\n>\n> Answer: Recommendation accepted.\n>\n> _Proposed recommendation: No: the workspace becomes read-only._\n>\n> Concerns: CON-03.\n");
  });

  it("marks the current phase in the index diagram by label, shape and dashed links, without colours", async () => {
    const index = renderToMemory(await requirementsFixture()).find((f) => f.path === "index.md")!.content;
    expect(index).toContain(
      '```mermaid\nflowchart LR\n  framing["Framing"]\n  requirements(["Requirements ◀ current"])\n  acceptance["Acceptance"]\n  anchoring["Anchoring"]\n  verification["Verification"]\n  done["Done"]\n  framing --> requirements\n  requirements -.-> acceptance\n  acceptance -.-> anchoring\n  anchoring -.-> verification\n  verification -.-> done\n```',
    );
    expect(index).not.toContain("classDef");
  });

  it("index: warns when the phase waits for answers, lists what is left and the questions as task lists", async () => {
    const index = renderToMemory(await guineaPig()).find((f) => f.path === "index.md")!.content;
    expect(index).toContain("> [!WARNING]\n> The Framing phase waits for your answers: 5 open question(s), Q-01, Q-02, Q-03, Q-04, Q-05.");
    expect(index).toContain("- [ ] Q-01 · question to answer\n- [ ] Q-02 · question to answer");
    expect(index).toContain("<!-- ptr: /framing/questions -->\n## Questions\n\n- [ ] Q-01 · Are creation (POST)");
    const done = renderToMemory(await requirementsFixture()).find((f) => f.path === "index.md")!.content;
    expect(done).not.toContain("[!WARNING]");
    expect(done).toContain("- [x] Q-05 · If the API returns neither an ETag nor a revision field");
  });

  it("index: warns when tests fail or are missing in the verification phase", async () => {
    const feature = inAcceptance(await guineaPig());
    feature.phase = "verification";
    feature.anchors = [{ id: "ANC-01", kind: "module", path: "src/http.ts", change: "add", realizes: ["REQ-001", "REQ-002"] }];
    feature.tests = [{ file: "t.ts", name: "AC-001.1 x", framework: "vitest", verifies: ["AC-001.1"], status: "failing" }];
    const index = renderToMemory(feature).find((f) => f.path === "index.md")!.content;
    expect(index).toContain("> [!WARNING]\n> Verification to redo: 1 test(s) failing or not yet written.");
  });

  it("cites a textual source of a requirement as a footnote, ids inline", async () => {
    const feature = await requirementsFixture();
    (feature.requirements as { source: string[] }[])[0]!.source = ["ACT-02", "Interview with the owner on 14 October"];
    const exigences = renderToMemory(feature).find((f) => f.path === "requirements.md")!.content;
    expect(exigences).toContain("Source: ACT-02[^REQ-001-1]\n\n[^REQ-001-1]: Interview with the owner on 14 October\n");
  });

  it("spec index warns about a feature with pending owner edits", async () => {
    const root = await workspace();
    await render(FEATURE, { root });
    const path = inFolder(root, "rendered", "framing.md");
    await writeFile(path, (await readFile(path, "utf8")).replace("without changing it", "without touching it"));
    await create("other", "Other", { root });
    const index = await readFile(join(root, "spec", "README.md"), "utf8");
    expect(index).toContain("> [!WARNING]\n> FEAT-001: 1 edit(s) made outside the agent, to reconcile before anything else.");
  });

  it("opens every document with the breadcrumb, the menu of documents in phase order and a rule", async () => {
    const files = renderToMemory(await requirementsFixture());
    const cadrage = files.find((f) => f.path === "framing.md")!.content;
    expect(cadrage.startsWith(
      '<!-- source: "/framing" template: "templates/framing.hbs" -->\n\n<!-- nav -->\n' +
        "[All features](../../README.md) › [FEAT-001 · HTTP connector for Maket structured workspaces](index.md) › Framing\n\n" +
        "[Index](index.md) · **Framing** · [Requirements](requirements.md) · Acceptance · Anchoring · Verification · Decisions\n\n---\n<!-- /nav -->\n\n_Document of the closed Framing phase",
    )).toBe(true);
    expect(cadrage.endsWith(
      "<!-- nav -->\n\n---\n\n[All features](../../README.md) › [FEAT-001 · HTTP connector for Maket structured workspaces](index.md) › Framing\n\n" +
        "[Index](index.md) · **Framing** · [Requirements](requirements.md) · Acceptance · Anchoring · Verification · Decisions\n\n" +
        "← Previous: [Index](index.md) · Next: [Requirements](requirements.md) →\n<!-- /nav -->\n",
    )).toBe(true);
    const exigences = files.find((f) => f.path === "requirements.md")!.content;
    expect(exigences).toContain("[Index](index.md) · [Framing](framing.md) · **Requirements** · Acceptance");
    expect(exigences).toContain("← Previous: [Framing](framing.md)\n<!-- /nav -->");
    const index = files.find((f) => f.path === "index.md")!.content;
    expect(index).toContain("<!-- nav -->\n[All features](../../README.md) › FEAT-001 · HTTP connector for Maket structured workspaces\n\n---\n<!-- /nav -->");
    expect(index).toContain("Next: [Framing](framing.md) →\n<!-- /nav -->");
    expect(index).not.toContain("**Index**");
  });

  it("spec index lists the features by phase", async () => {
    const root = await workspace();
    await render(FEATURE, { root });
    await create("other", "Other", { root });
    const index = await readFile(join(root, "spec", "README.md"), "utf8");
    expect(index).toContain(
      "<!-- nav -->\n**Framing**: [FEAT-001 · HTTP connector for Maket structured workspaces](FEAT-001-maket-http-connector/rendered/index.md) · [FEAT-002 · Other](FEAT-002-other/rendered/index.md)\n\n**Requirements**: —",
    );
    expect(index).toContain("| Id | Feature |");
  });

  it("names the object of each thing left to do, in natural order", async () => {
    const feature = inAcceptance(await guineaPig());
    feature.phase = "verification";
    feature.anchors = [{ id: "ANC-01", kind: "symbol", path: "src/http.ts", symbol: "Http.list", change: "add", realizes: ["REQ-001", "REQ-002"] }];
    feature.tests = [{ file: "t.ts", name: "AC-002.1 x", framework: "vitest", level: "unit", verifies: ["AC-002.1"], status: "failing" }];
    const index = renderToMemory(feature).find((f) => f.path === "index.md")!.content;
    const todo = index.slice(index.indexOf("## Left to do"), index.indexOf("## Questions"));
    expect(todo).toContain("- [ ] AC-001.1 · test to declare\n- [ ] AC-002.1 · test to make pass");
    expect(todo).not.toContain("`/");
  });

  it("labels anchors and tests from the schema and totals the coverage with a status per criterion", async () => {
    const feature = inAcceptance(await guineaPig());
    feature.phase = "verification";
    feature.anchors = [{ id: "ANC-01", kind: "symbol", path: "src/http.ts", symbol: "Http.list", change: "add", realizes: ["REQ-001", "REQ-002"] }];
    feature.tests = [
      { file: "t.ts", name: "AC-001.1 x", framework: "vitest", level: "unit", method: "test", verifies: ["AC-001.1"], status: "passing" },
      { file: "t.ts", name: "AC-002.1 y", framework: "vitest", method: "inspection", reason: "By eye.", verifies: ["AC-002.1"] },
    ];
    const files = renderToMemory(feature);
    expect(files.find((f) => f.path === "anchors.md")!.content).toContain("(symbol, addition)");
    const verification = files.find((f) => f.path === "verification.md")!.content;
    expect(verification).toContain("(vitest, unit, test). Verifies AC-001.1. Status: **passing**.");
    expect(verification).toContain("| Criterion | Tests | Status |\n| --- | --- | --- |\n| AC-001.1 | 1 | passing |\n| AC-002.1 | 1 | inspection, justified |\n| **Total** | 2 | 2 of 2 criteria verified |");
  });

  it("shows the reason of a backward move in the history", async () => {
    const feature = await requirementsFixture();
    (feature.lifecycle as { phaseHistory: unknown[] }).phaseHistory.push({ phase: "framing", date: "2026-10-14T12:00:00.000Z", by: "owner", reason: "Review the scope." });
    feature.phase = "framing";
    const index = renderToMemory(feature).find((f) => f.path === "index.md")!.content;
    expect(index).toContain("- 2026-10-14: phase Framing, decided by the owner, moved back: Review the scope.");
  });
});
