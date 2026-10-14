import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { advancePhase, diff, features, featuresReport, patch, render, status, verify } from "../src/lib/index.js";
import { FEATURE, inFolder, workspace } from "./helpers.js";

async function withSvg() {
  const root = await workspace();
  await render(FEATURE, { root });
  await mkdir(inFolder(root, "assets"), { recursive: true });
  await writeFile(inFolder(root, "assets", "screen.svg"), '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>\n');
  const result = await patch(
    FEATURE,
    [{ op: "add", path: "/artifacts/-", value: { id: "ART-02", kind: "screen", format: "svg", title: "Écran de l'espace", path: "assets/screen.svg", illustrates: [] } }],
    { root },
  );
  expect(result.ok).toBe(true);
  return root;
}

const NOW = "2026-10-14T12:00:00.000Z";

const kinds = async (root: string) => (await diff(FEATURE, { root })).alterations.map((a) => [a.kind, a.path, a.ids]);

describe("alterations", () => {
  it("writes a manifest with hashes and render timestamps for feature.json, rendered files and assets", async () => {
    const root = await withSvg();
    const manifest = JSON.parse(await readFile(inFolder(root, ".manifest.json"), "utf8"));
    expect(Object.keys(manifest)).toEqual(["feature", "files", "assets"]);
    expect(manifest.feature.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.keys(manifest.files)).toEqual(["index.md", "cadrage.md"]);
    expect(Object.keys(manifest.assets)).toEqual(["assets/screen.svg"]);
    expect(manifest.assets["assets/screen.svg"].renderedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("classifies an edited rendered file, with the ids it touches", async () => {
    const root = await withSvg();
    const path = inFolder(root, "rendered", "cadrage.md");
    await writeFile(path, (await readFile(path, "utf8")).replace("sans la modifier", "sans la modifier ni l'étendre"));
    expect(await kinds(root)).toEqual([["rendered-changed", "rendered/cadrage.md", ["CON-01"]]]);
  });

  it("classifies an edited svg as an asset to review visually, with its ART id", async () => {
    const root = await withSvg();
    await writeFile(inFolder(root, "assets", "screen.svg"), '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>\n');
    const result = await diff(FEATURE, { root });
    expect(result.alterations).toEqual([{ kind: "asset-changed", path: "assets/screen.svg", ids: ["ART-02"], message: "artifact changed, review visually" }]);
    expect(result.files.find((f) => f.path === "assets/screen.svg")).toMatchObject({ artifact: "ART-02", review: "artifact changed, review visually", hunks: [] });
  });

  it("classifies feature.json changed outside the MCP, revalidated with its schema errors", async () => {
    const root = await withSvg();
    const json = JSON.parse(await readFile(inFolder(root, "feature.json"), "utf8"));
    json.framing.actors[0].id = "ACTOR-1";
    await writeFile(inFolder(root, "feature.json"), JSON.stringify(json, null, 2));
    const [alteration] = (await diff(FEATURE, { root })).alterations;
    expect(alteration).toMatchObject({ kind: "feature-changed", path: "feature.json" });
    expect(alteration!.errors).toContainEqual(expect.objectContaining({ pointer: "/framing/actors/0/id", kind: "invalid" }));
  });

  it("classifies a deleted rendered file and a file added by hand", async () => {
    const root = await withSvg();
    await rm(inFolder(root, "rendered", "cadrage.md"));
    await writeFile(inFolder(root, "rendered", "notes.md"), "# Mes notes\n");
    expect(await kinds(root)).toEqual([
      ["rendered-missing", "rendered/cadrage.md", []],
      ["rendered-extra", "rendered/notes.md", []],
    ]);
  });

  it("shows alterations in status, features and the spec index", async () => {
    const root = await withSvg();
    await writeFile(inFolder(root, "assets", "screen.svg"), "<svg/>\n");
    const s = await status(FEATURE, { root });
    expect(s.ownerEdits).toEqual({ state: "pending", files: 1, hunks: 1, ids: ["ART-02"] });
    expect((await features({ root }))[0]).toMatchObject({ id: "FEAT-001", ownerEdits: "pending", alterations: 1 });
    const result = await render(FEATURE, { root });
    expect(result.refused).toEqual(["assets/screen.svg"]);
  });

  it("verify removes a file added by hand in rendered/, after saving it, and the phase can advance again", async () => {
    const root = await withSvg();
    await writeFile(inFolder(root, "rendered", "notes.md"), "# Mes notes\n");
    const result = await verify(FEATURE, { ops: [], applied: 1, reported: [] }, { root, now: NOW });
    expect(result.ok).toBe(true);
    expect(result.patch?.render?.removed).toEqual(["notes.md"]);
    expect(await readFile(inFolder(root, ".spec-loop", "overwritten", "2026-10-14T12-00-00-000Z", "rendered", "notes.md"), "utf8")).toBe("# Mes notes\n");
    await expect(readFile(inFolder(root, "rendered", "notes.md"), "utf8")).rejects.toThrow();
    expect((await status(FEATURE, { root })).ownerEdits.state).toBe("none");
  });

  it("a deleted rendered file is an owner edit: render and patch refuse, verify recreates it", async () => {
    const root = await withSvg();
    await rm(inFolder(root, "rendered", "cadrage.md"));
    expect((await render(FEATURE, { root })).refused).toEqual(["cadrage.md"]);
    expect((await patch(FEATURE, [{ op: "add", path: "/framing/glossary/-", value: { term: "curseur", definition: "Position opaque renvoyée par l'API." } }], { root })).ok).toBe(false);
    expect((await verify(FEATURE, { ops: [], applied: 1, reported: [] }, { root })).ok).toBe(true);
    expect(await readFile(inFolder(root, "rendered", "cadrage.md"), "utf8")).toContain("# Cadrage");
  });

  it("a hand-edited feature.json blocks patch, render and phase until verify accepts it with a reason", async () => {
    const root = await withSvg();
    const json = JSON.parse(await readFile(inFolder(root, "feature.json"), "utf8"));
    json.framing.intent = `${json.framing.intent} Ajout à la main.`;
    await writeFile(inFolder(root, "feature.json"), JSON.stringify(json, null, 2));
    expect((await render(FEATURE, { root })).refused).toEqual(["feature.json"]);
    const refused = await patch(FEATURE, [{ op: "replace", path: "/title", value: "Autre titre" }], { root });
    expect(refused.errors[0]!.message).toContain("feature.json was changed outside the MCP");
    expect((await advancePhase(FEATURE, { root })).ok).toBe(false);
    expect((await verify(FEATURE, { ops: [], applied: 1, reported: [] }, { root })).errors[0]).toContain("featureChange");
    const accepted = await verify(FEATURE, { ops: [], applied: 1, reported: [], featureChange: { action: "accept", reason: "Précision voulue par le propriétaire." } }, { root, now: NOW });
    expect(accepted.ok).toBe(true);
    const after = JSON.parse(await readFile(inFolder(root, "feature.json"), "utf8"));
    expect(after.framing.intent).toContain("Ajout à la main.");
    expect(after.lifecycle.acceptedChanges).toEqual([{ date: NOW, reason: "Précision voulue par le propriétaire." }]);
    expect((await status(FEATURE, { root })).ownerEdits.state).toBe("none");
  });

  it("a phase changed by hand in feature.json cannot be accepted, only restored", async () => {
    const root = await withSvg();
    const before = await readFile(inFolder(root, "feature.json"), "utf8");
    const json = JSON.parse(before);
    json.phase = "requirements";
    json.requirements = [];
    await writeFile(inFolder(root, "feature.json"), JSON.stringify(json, null, 2));
    expect((await advancePhase(FEATURE, { root })).ok).toBe(false);
    const accept = await verify(FEATURE, { ops: [], applied: 1, reported: [], featureChange: { action: "accept", reason: "x" } }, { root });
    expect(accept.errors[0]).toContain("phase changed by hand cannot be accepted");
    const restore = await verify(
      FEATURE,
      { ops: [], applied: 0, reported: [{ file: "feature.json", pointer: "/phase", reason: "La phase se change par l'outil phase." }], featureChange: { action: "restore", reason: "Phase changée à la main." } },
      { root, now: NOW },
    );
    expect(restore.ok).toBe(true);
    const restored = JSON.parse(await readFile(inFolder(root, "feature.json"), "utf8"));
    expect(restored.phase).toBe("framing");
    expect(restored.requirements).toBeUndefined();
    expect(await readFile(inFolder(root, ".spec-loop", "overwritten", "2026-10-14T12-00-00-000Z", "feature.json"), "utf8")).toContain('"requirements"');
  });

  it("lists a corrupted feature.json with its path, and status names the file", async () => {
    const root = await withSvg();
    await writeFile(inFolder(root, "feature.json"), "{ broken");
    const report = await featuresReport({ root });
    expect(report.root).toBe(root);
    expect(report.features[0]).toMatchObject({ id: "FEAT-001", corrupted: expect.any(String), path: inFolder(root, "feature.json") });
    await expect(status(FEATURE, { root })).rejects.toThrow(inFolder(root, "feature.json"));
  });
});
