import { readFile, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { diff, render } from "../src/lib/index.js";
import { FEATURE, inFolder, workspace } from "./helpers.js";

async function prepared() {
  const root = await workspace("requirements");
  await render(FEATURE, { root });
  return { root, file: (name: string) => inFolder(root, "rendered", name) };
}

async function edit(path: string, from: string, to: string) {
  const text = await readFile(path, "utf8");
  if (!text.includes(from)) throw new Error(`"${from}" not found in ${path}`);
  await writeFile(path, text.replace(from, to));
}

describe("diff", () => {
  it("is clean right after a render", async () => {
    const { root } = await prepared();
    const result = await diff(FEATURE, { root });
    expect(result.clean).toBe(true);
    expect(result.alterations).toEqual([]);
  });

  it("maps an edited requirement to its id and JSON pointer", async () => {
    const { root, file } = await prepared();
    await edit(file("requirements.md"), "report a stale revision to the agent", "report a stale revision to the agent and reload the item");
    const result = await diff(FEATURE, { root });
    const modified = result.files.filter((f) => f.status === "modified");
    expect(modified.map((f) => f.path)).toEqual(["requirements.md"]);
    expect(modified[0]!.editedByOwner).toBe(true);
    expect(modified[0]!.hunks).toHaveLength(1);
    expect(modified[0]!.hunks[0]!.target).toEqual({ id: "REQ-002", pointer: "/requirements/1" });
    expect(result.ownerEdits).toEqual({ files: 1, hunks: 1, ids: ["REQ-002"] });
  });

  it("maps an edited scope line and an edited constraint to their pointers", async () => {
    const { root, file } = await prepared();
    await edit(file("framing.md"), "Read an item by its identity.", "Read an item by its identity or by its URL.");
    await edit(file("framing.md"), "without changing it", "without changing or extending it");
    const hunks = (await diff(FEATURE, { root })).files.find((f) => f.path === "framing.md")!.hunks;
    expect(hunks.map((h) => h.target)).toEqual([
      { id: null, pointer: "/framing/scope/in/1" },
      { id: "CON-01", pointer: "/framing/constraints/0" },
    ]);
  });

  it("maps an edited mermaid source to its artifact id", async () => {
    const { root, file } = await prepared();
    await edit(file("framing.md"), "api -- \"JSON, ETag, 412\" --> connector", "api -- \"JSON, ETag, 412, 429\" --> connector");
    const [hunk] = (await diff(FEATURE, { root })).files.find((f) => f.path === "framing.md")!.hunks;
    expect(hunk!.target).toEqual({ id: "ART-01", pointer: "/artifacts/0" });
  });

  it("reports an id added by the owner as new", async () => {
    const { root, file } = await prepared();
    const text = await readFile(file("requirements.md"), "utf8");
    await writeFile(file("requirements.md"), `${text}\n<!-- id: REQ-003 -->\n## REQ-003\n\nWhen the agent deletes an item, the connector SHALL send DELETE with If-Match.\n`);
    const [hunk] = (await diff(FEATURE, { root })).files.find((f) => f.path === "requirements.md")!.hunks;
    expect(hunk!.newIds).toEqual(["REQ-003"]);
    expect(hunk!.target).toEqual({ id: "REQ-002", pointer: "/requirements/1" });
  });

  it("attributes an edit of the navigation to no id and no pointer, and still maps edits elsewhere", async () => {
    const { root, file } = await prepared();
    await edit(file("requirements.md"), "[Index](index.md) · [Framing](framing.md) · **Requirements**", "[Index](index.md) · [Framing](framing.md) · **My requirements**");
    await edit(file("requirements.md"), "report a stale revision to the agent", "report a stale revision to the agent at once");
    const hunks = (await diff(FEATURE, { root })).files.find((f) => f.path === "requirements.md")!.hunks;
    expect(hunks.map((h) => h.target)).toEqual([
      { id: null, pointer: null },
      { id: "REQ-002", pointer: "/requirements/1" },
    ]);
  });
});
