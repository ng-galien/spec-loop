import { readFile, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { diff, patch, render } from "../src/lib/index.js";
import { FEATURE, inFolder, workspace } from "./helpers.js";

describe("patch", () => {
  it("applies a JSON Patch, writes feature.json and re-renders", async () => {
    const root = await workspace();
    await render(FEATURE, { root });
    const result = await patch(FEATURE, [
      { op: "replace", path: "/framing/questions/0/status", value: "answered" },
      { op: "add", path: "/framing/questions/0/answer", value: "Oui, POST et DELETE en première version." },
    ], { root });
    expect(result.ok).toBe(true);
    expect(result.render?.files.find((f) => f.path === "cadrage.md")?.changed).toBe(true);
    expect(await readFile(inFolder(root, "rendered", "cadrage.md"), "utf8")).toContain("Réponse : Oui, POST et DELETE en première version.");
    const stored = JSON.parse(await readFile(inFolder(root, "feature.json"), "utf8"));
    expect(stored.framing.questions[0].status).toBe("answered");
    expect((await diff(FEATURE, { root })).clean).toBe(true);
  });

  it("refuses a patch that mixes phases, and writes nothing", async () => {
    const root = await workspace();
    const before = await readFile(inFolder(root, "feature.json"), "utf8");
    const result = await patch(FEATURE, [{ op: "add", path: "/requirements", value: [] }], { root });
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ pointer: "/requirements", kind: "invalid" }));
    expect(await readFile(inFolder(root, "feature.json"), "utf8")).toBe(before);
  });

  it("refuses a malformed operation with its pointer", async () => {
    const root = await workspace();
    const result = await patch(FEATURE, [{ op: "replace", path: "/framing/nothing/here", value: 1 }], { root });
    expect(result.ok).toBe(false);
    expect(result.errors[0]!.pointer).toBe("/framing/nothing/here");
  });

  it("refuses to touch id, name, phase or lifecycle", async () => {
    const root = await workspace();
    const result = await patch(FEATURE, [{ op: "replace", path: "/phase", value: "requirements" }], { root });
    expect(result.ok).toBe(false);
    expect(result.errors[0]!.pointer).toBe("/phase");
  });

  it("refuses while owner edits are not verified", async () => {
    const root = await workspace();
    await render(FEATURE, { root });
    const path = inFolder(root, "rendered", "cadrage.md");
    await writeFile(path, (await readFile(path, "utf8")).replace("Lire un élément", "Lire vite un élément"));
    const result = await patch(FEATURE, [{ op: "replace", path: "/framing/scope/in/1", value: "Lire un élément par son URL." }], { root });
    expect(result.ok).toBe(false);
    expect(result.errors[0]!.message).toContain("cadrage.md was changed outside the MCP and is not verified yet");
  });
});
