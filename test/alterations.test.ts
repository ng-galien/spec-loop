import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { diff, features, patch, render, status } from "../src/lib/index.js";
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
});
