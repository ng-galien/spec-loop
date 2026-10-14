import { readFile, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { diff, patch, reconcile, render } from "../src/lib/index.js";
import { FEATURE, inFolder, workspace } from "./helpers.js";

describe("patch", () => {
  it("refuses to replace the whole document, or to move or copy from it, even when id, name, phase and lifecycle look unchanged elsewhere", async () => {
    const root = await workspace();
    await render(FEATURE, { root });
    const before = await readFile(inFolder(root, "feature.json"), "utf8");
    const json = JSON.parse(before);
    const forged = { ...json, phase: "done", lifecycle: { created: json.lifecycle.created, phaseHistory: [{ phase: "done", date: json.lifecycle.created, by: "owner" }] } };
    for (const op of [
      { op: "replace" as const, path: "", value: forged },
      { op: "move" as const, from: "", path: "/framing/notes" },
      { op: "copy" as const, from: "", path: "/framing/notes" },
    ]) {
      const result = await patch(FEATURE, [op], { root });
      expect(result.ok, op.op).toBe(false);
      expect(result.errors[0]!.message).toContain("id, name, phase and lifecycle are written by the create, phase and reconcile tools only");
    }
    expect(await readFile(inFolder(root, "feature.json"), "utf8")).toBe(before);
    const reconciled = await reconcile(FEATURE, { ops: [{ op: "replace", path: "", value: forged }], applied: 0, reported: [] }, { root });
    expect(reconciled.ok).toBe(false);
    expect(reconciled.errors).toEqual([": id, name, phase and lifecycle cannot be patched"]);
  });

  it("never writes a Mermaid diagram that does not parse", async () => {
    const root = await workspace();
    await render(FEATURE, { root });
    const before = await readFile(inFolder(root, "feature.json"), "utf8");
    const result = await patch(FEATURE, [{ op: "replace", path: "/artifacts/0/source", value: "flowchart LR\n  agent -->" }], { root });
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([expect.objectContaining({ pointer: "/artifacts/0", kind: "invalid" })]);
    expect(await readFile(inFolder(root, "feature.json"), "utf8")).toBe(before);
  });

  it("applies a JSON Patch, writes feature.json and re-renders", async () => {
    const root = await workspace();
    await render(FEATURE, { root });
    const result = await patch(FEATURE, [
      { op: "replace", path: "/framing/questions/0/status", value: "answered" },
      { op: "add", path: "/framing/questions/0/answer", value: "Yes, POST and DELETE in the first version." },
    ], { root });
    expect(result.ok).toBe(true);
    expect(result.render?.files.find((f) => f.path === "framing.md")?.changed).toBe(true);
    expect(await readFile(inFolder(root, "rendered", "framing.md"), "utf8")).toContain("> Answer: Yes, POST and DELETE in the first version.");
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
    const path = inFolder(root, "rendered", "framing.md");
    await writeFile(path, (await readFile(path, "utf8")).replace("Read an item", "Quickly read an item"));
    const result = await patch(FEATURE, [{ op: "replace", path: "/framing/scope/in/1", value: "Read an item by its URL." }], { root });
    expect(result.ok).toBe(false);
    expect(result.errors[0]!.message).toContain("framing.md was changed outside the MCP and is not reconciled yet");
  });
});
