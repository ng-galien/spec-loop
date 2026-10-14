import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { create, features } from "../src/lib/index.js";
import { serializeFeature } from "../src/lib/model.js";
import { FEATURE, guineaPig, inAcceptance, inFolder, workspace } from "./helpers.js";

const NOW = "2026-10-14T12:00:00.000Z";

describe("create: one feature at a time", () => {
  it("creates the first feature of an empty project", async () => {
    const root = await mkdtemp(join(tmpdir(), "spec-loop-test-"));
    expect(await create("export-csv", "Export CSV", { root, now: NOW })).toMatchObject({ ok: true, id: "FEAT-001" });
  });

  it("refuses while another feature is not done, naming it with its phase and missing count", async () => {
    const root = await workspace();
    const refused = await create("export-csv", "Export CSV", { root });
    expect(refused.ok).toBe(false);
    expect(refused.errors.map((e) => e.message)).toEqual([
      'FEAT-001-maket-http-connector is unfinished: phase "framing", 5 item(s) missing',
      'one feature at a time: finish FEAT-001 first; only the owner may open another one now, with by "owner" and a reason',
    ]);
    expect((await create("export-csv", "Export CSV", { root, by: "agent", reason: "faster" })).ok).toBe(false);
    expect((await create("export-csv", "Export CSV", { root, by: "owner", reason: "  " })).ok).toBe(false);
    expect((await features({ root })).map((f) => f.id)).toEqual([FEATURE]);
  });

  it("lets the owner open another feature with a reason, recorded in its lifecycle", async () => {
    const root = await workspace();
    const result = await create("export-csv", "Export CSV", { root, by: "owner", reason: "The demo needs both.", now: NOW });
    expect(result).toMatchObject({ ok: true, id: "FEAT-002" });
    const json = JSON.parse(await readFile(join(root, "spec", "FEAT-002-export-csv", "feature.json"), "utf8"));
    expect(json.lifecycle).toEqual({
      created: NOW,
      phaseHistory: [{ phase: "framing", date: NOW, by: "owner" }],
      openedWhileUnfinished: { features: ["FEAT-001"], reason: "The demo needs both.", date: NOW },
    });
    expect(result.render?.validation.valid).toBe(true);
  });

  it("creates freely once every feature is done", async () => {
    const root = await workspace();
    const done = inAcceptance(await guineaPig());
    done.phase = "done";
    done.anchors = [{ id: "ANC-01", kind: "module", path: "src/http.ts", change: "add", realizes: ["REQ-001", "REQ-002"] }];
    done.tests = ["AC-001.1", "AC-002.1"].map((ac) => ({ file: "test/http.test.ts", name: `${ac} case`, framework: "vitest", verifies: [ac], status: "passing" }));
    done.lifecycle = { created: NOW, phaseHistory: ["framing", "requirements", "acceptance", "anchoring", "verification", "done"].map((phase) => ({ phase, date: NOW, by: "owner" })) };
    await writeFile(inFolder(root, "feature.json"), serializeFeature(done));
    const result = await create("export-csv", "Export CSV", { root, now: NOW });
    expect(result).toMatchObject({ ok: true, id: "FEAT-002" });
    const json = JSON.parse(await readFile(join(root, "spec", "FEAT-002-export-csv", "feature.json"), "utf8"));
    expect(json.lifecycle.openedWhileUnfinished).toBeUndefined();
  });
});
