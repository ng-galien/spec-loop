import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { advancePhase, create, features, patch, render, status, verify } from "../src/lib/index.js";
import { FEATURE, inFolder, workspace } from "./helpers.js";

const NOW = "2026-10-14T12:00:00.000Z";

async function answered(root: string) {
  await render(FEATURE, { root });
  const ops = [0, 1, 2, 3, 4].flatMap((i) => [
    { op: "replace" as const, path: `/framing/questions/${i}/status`, value: "answered" },
    { op: "add" as const, path: `/framing/questions/${i}/answer`, value: "Recommandation retenue." },
  ]);
  expect((await patch(FEATURE, ops, { root })).ok).toBe(true);
}

describe("lifecycle", () => {
  it("creates the next numbered feature in the first phase and renders it", async () => {
    const root = await workspace();
    const result = await create("export-csv", "Export CSV", { root, now: NOW });
    expect(result).toMatchObject({ ok: true, id: "FEAT-002", feature: "FEAT-002-export-csv" });
    const json = JSON.parse(await readFile(join(root, "spec", "FEAT-002-export-csv", "feature.json"), "utf8"));
    expect(json).toMatchObject({ id: "FEAT-002", name: "export-csv", phase: "framing", lifecycle: { created: NOW, phaseHistory: [{ phase: "framing", date: NOW, by: "agent" }] } });
    expect((await features({ root })).map((f) => f.id)).toEqual(["FEAT-001", "FEAT-002"]);
    expect(await readFile(join(root, "spec", "README.md"), "utf8")).toContain("| FEAT-002 | Export CSV | Cadrage |");
    expect((await create("export-csv", "Doublon", { root })).ok).toBe(false);
    expect(json.$schema).toBe("../feature.schema.json");
    expect(JSON.parse(await readFile(join(root, "spec", "feature.schema.json"), "utf8"))["x-phases"]).toBeDefined();
  });

  it("refuses to create without an absolute root", async () => {
    expect((await create("export-csv", "Export CSV", { root: "relative/project" })).errors[0]!.message).toContain("absolute path");
    expect((await create("export-csv", "Export CSV", {})).ok).toBe(false);
  });

  it("status lists the fields of the phase never set, optional ones included; an empty array counts as addressed", async () => {
    const root = await workspace();
    await create("export-csv", "Export CSV", { root, now: NOW });
    const s = await status("FEAT-002", { root });
    expect(s.root).toBe(root);
    expect(s.spec).toBe(join(root, "spec"));
    expect(s.unaddressed.map((u) => u.pointer)).toEqual(["/framing/constraints", "/framing/assumptions", "/framing/questions", "/framing/glossary"]);
    expect((await patch("FEAT-002", [{ op: "add", path: "/framing/glossary", value: [] }], { root })).ok).toBe(true);
    expect((await status("FEAT-002", { root })).unaddressed.map((u) => u.pointer)).not.toContain("/framing/glossary");
    expect((await status(FEATURE, { root })).unaddressed).toEqual([]);
  });

  it("refuses to advance an incomplete phase, and says why", async () => {
    const root = await workspace();
    await render(FEATURE, { root });
    const result = await advancePhase(FEATURE, { root });
    expect(result.ok).toBe(false);
    expect(result.reasons[0]).toContain('phase "framing" is incomplete: 5 item(s) missing');
  });

  it("refuses to advance while owner edits are pending", async () => {
    const root = await workspace();
    await answered(root);
    const path = inFolder(root, "rendered", "cadrage.md");
    await writeFile(path, (await readFile(path, "utf8")).replace("sans la modifier", "sans la modifier ni l'étendre"));
    const result = await advancePhase(FEATURE, { root });
    expect(result.ok).toBe(false);
    expect(result.reasons).toEqual(["1 owner edit(s) or alteration(s) pending: run the verify skill first"]);
  });

  it("advances a complete phase and records who decided", async () => {
    const root = await workspace();
    await answered(root);
    const result = await advancePhase(FEATURE, { root, by: "owner", now: NOW });
    expect(result).toMatchObject({ ok: true, from: "framing", to: "requirements" });
    const s = await status(FEATURE, { root });
    expect(s.phase).toBe("requirements");
    expect(s.phaseHistory.at(-1)).toEqual({ phase: "requirements", date: NOW, by: "owner" });
    expect(s.completeness.missing).toContainEqual(expect.objectContaining({ pointer: "/requirements" }));
    expect(await readFile(inFolder(root, "rendered", "exigences.md"), "utf8")).toContain("# Exigences");
  });

  it("verify requires every pending item to be accounted for, then reconciles and records lastVerify", async () => {
    const root = await workspace();
    await render(FEATURE, { root });
    const path = inFolder(root, "rendered", "cadrage.md");
    const edited = (await readFile(path, "utf8"))
      .replace("Lire un élément par son identité.", "Lire un élément par son identité ou par son URL.")
      .replace("API qui ne sont pas REST", "API qui ne sont pas REST, ni SSE");
    await writeFile(path, edited);
    expect((await status(FEATURE, { root })).ownerEdits).toMatchObject({ state: "pending", hunks: 2 });
    const short = await verify(FEATURE, { ops: [], applied: 1, reported: [] }, { root });
    expect(short.ok).toBe(false);
    const done = await verify(
      FEATURE,
      {
        ops: [{ op: "replace", path: "/framing/scope/in/1", value: "Lire un élément par son identité ou par son URL." }],
        applied: 1,
        reported: [{ file: "rendered/cadrage.md", pointer: "/framing/scope/out/1", reason: "Exclure SSE élargit le hors-périmètre ; à confirmer." }],
      },
      { root, now: NOW },
    );
    expect(done.ok).toBe(true);
    expect(done.patch?.render?.backedUp).toEqual([".spec-loop/overwritten/2026-10-14T12-00-00-000Z/rendered/cadrage.md"]);
    expect(done.questions).toEqual(["Q-06"]);
    const s = await status(FEATURE, { root });
    expect(s.ownerEdits.state).toBe("none");
    expect(s.lastVerify).toMatchObject({ date: NOW, applied: 1, reported: [{ pointer: "/framing/scope/out/1" }] });
    const json = JSON.parse(await readFile(inFolder(root, "feature.json"), "utf8"));
    expect(json.framing.questions.at(-1)).toEqual({
      id: "Q-06",
      question: "Modification signalée (rendered/cadrage.md, /framing/scope/out/1) : Exclure SSE élargit le hors-périmètre ; à confirmer.",
      status: "open",
    });
    expect(s.completeness.missing).toContainEqual(expect.objectContaining({ pointer: "/framing/questions/5/status" }));
    expect(await readFile(path, "utf8")).toContain("Lire un élément par son identité ou par son URL.");
    expect(await readFile(path, "utf8")).not.toContain("ni SSE");
  });

  it("refuses to leave requirements while an interface requirement has no screen wireframe", async () => {
    const root = await workspace("requirements");
    await render(FEATURE, { root });
    expect((await patch(FEATURE, [{ op: "replace", path: "/requirements/0/facet", value: "interface" }], { root })).ok).toBe(true);
    const s = await status(FEATURE, { root });
    expect(s.completeness.missing).toEqual([{ pointer: "/requirements/0", message: "REQ-001 attend sa maquette d'écran", kind: "incomplete" }]);
    const refused = await advancePhase(FEATURE, { root });
    expect(refused.ok).toBe(false);
    expect(refused.reasons[0]).toContain('phase "requirements" is incomplete: 1 item(s) missing');
    await mkdir(inFolder(root, "assets"), { recursive: true });
    await writeFile(inFolder(root, "assets", "screen.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>\n');
    const art = { id: "ART-02", kind: "screen", format: "svg", title: "Écran", path: "assets/screen.svg", illustrates: ["REQ-001"] };
    expect((await patch(FEATURE, [{ op: "add", path: "/artifacts/-", value: art }], { root })).ok).toBe(true);
    const exigences = await readFile(inFolder(root, "rendered", "exigences.md"), "utf8");
    expect(exigences).toContain("<!-- id: ART-02 -->\n**Écran** (`ART-02`, écran)\n\n![Écran](../assets/screen.svg)");
    expect(exigences.indexOf("<!-- id: ART-02 -->")).toBeLessThan(exigences.indexOf("<!-- id: REQ-002 -->"));
    expect((await advancePhase(FEATURE, { root, now: NOW })).ok).toBe(true);
  });
});
