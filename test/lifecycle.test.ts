import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { advancePhase, create, features, learn, patch, phases, render, status, reconcile } from "../src/lib/index.js";
import { FEATURE, guineaPig, inAcceptance, inFolder, workspace } from "./helpers.js";
import { serializeFeature } from "../src/lib/model.js";

const NOW = "2026-10-14T12:00:00.000Z";

async function answered(root: string) {
  await render(FEATURE, { root });
  const ops = [0, 1, 2, 3, 4].flatMap((i) => [
    { op: "replace" as const, path: `/framing/questions/${i}/status`, value: "answered" },
    { op: "add" as const, path: `/framing/questions/${i}/answer`, value: "Recommendation accepted." },
  ]);
  expect((await patch(FEATURE, ops, { root })).ok).toBe(true);
}

describe("lifecycle", () => {
  it("creates the next numbered feature in the first phase and renders it", async () => {
    const root = await workspace();
    const result = await create("export-csv", "Export CSV", { root, now: NOW, by: "owner", reason: "Needed for the demo." });
    expect(result).toMatchObject({ ok: true, id: "FEAT-002", feature: "FEAT-002-export-csv" });
    const json = JSON.parse(await readFile(join(root, "spec", "FEAT-002-export-csv", "feature.json"), "utf8"));
    expect(json).toMatchObject({ id: "FEAT-002", name: "export-csv", phase: "framing", lifecycle: { created: NOW, phaseHistory: [{ phase: "framing", date: NOW, by: "owner" }] } });
    expect((await features({ root })).map((f) => f.id)).toEqual(["FEAT-001", "FEAT-002"]);
    expect(await readFile(join(root, "spec", "README.md"), "utf8")).toContain("| FEAT-002 | Export CSV | Framing |");
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
    await create("export-csv", "Export CSV", { root, now: NOW, by: "owner", reason: "Needed for the demo." });
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
    const path = inFolder(root, "rendered", "framing.md");
    await writeFile(path, (await readFile(path, "utf8")).replace("without changing it", "without changing or extending it"));
    const result = await advancePhase(FEATURE, { root });
    expect(result.ok).toBe(false);
    expect(result.reasons).toEqual(["1 owner edit(s) or alteration(s) pending: run the reconcile skill first"]);
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
    expect(await readFile(inFolder(root, "rendered", "requirements.md"), "utf8")).toContain("# Requirements");
  });

  it("reconcile requires every pending item to be accounted for, then reconciles and records lastVerify", async () => {
    const root = await workspace();
    await render(FEATURE, { root });
    const path = inFolder(root, "rendered", "framing.md");
    const edited = (await readFile(path, "utf8"))
      .replace("Read an item by its identity.", "Read an item by its identity or by its URL.")
      .replace("APIs that are not REST", "APIs that are not REST, nor SSE");
    await writeFile(path, edited);
    expect((await status(FEATURE, { root })).ownerEdits).toMatchObject({ state: "pending", hunks: 2 });
    const short = await reconcile(FEATURE, { ops: [], applied: 1, reported: [] }, { root });
    expect(short.ok).toBe(false);
    const done = await reconcile(
      FEATURE,
      {
        ops: [{ op: "replace", path: "/framing/scope/in/1", value: "Read an item by its identity or by its URL." }],
        applied: 1,
        reported: [{ file: "rendered/framing.md", pointer: "/framing/scope/out/1", reason: "Excluding SSE widens the out-of-scope list; to confirm." }],
      },
      { root, now: NOW },
    );
    expect(done.ok).toBe(true);
    expect(done.patch?.render?.backedUp).toEqual([".spec-loop/overwritten/2026-10-14T12-00-00-000Z/rendered/framing.md"]);
    expect(done.questions).toEqual(["Q-06"]);
    const s = await status(FEATURE, { root });
    expect(s.ownerEdits.state).toBe("none");
    expect(s.lastVerify).toMatchObject({ date: NOW, applied: 1, reported: [{ pointer: "/framing/scope/out/1" }] });
    const json = JSON.parse(await readFile(inFolder(root, "feature.json"), "utf8"));
    expect(json.framing.questions.at(-1)).toEqual({
      id: "Q-06",
      question: "Reported edit (rendered/framing.md, /framing/scope/out/1): Excluding SSE widens the out-of-scope list; to confirm.",
      status: "open",
    });
    expect(s.completeness.missing).toContainEqual(expect.objectContaining({ pointer: "/framing/questions/5/status" }));
    expect(await readFile(path, "utf8")).toContain("Read an item by its identity or by its URL.");
    expect(await readFile(path, "utf8")).not.toContain("nor SSE");
  });

  it("refuses to leave requirements while an interface requirement has no screen wireframe", async () => {
    const root = await workspace("requirements");
    await render(FEATURE, { root });
    expect((await patch(FEATURE, [{ op: "replace", path: "/requirements/0/facet", value: "interface" }], { root })).ok).toBe(true);
    const s = await status(FEATURE, { root });
    expect(s.completeness.missing).toEqual([{ pointer: "/requirements/0", message: "REQ-001 needs its screen wireframe", kind: "incomplete" }]);
    const refused = await advancePhase(FEATURE, { root });
    expect(refused.ok).toBe(false);
    expect(refused.reasons[0]).toContain('phase "requirements" is incomplete: 1 item(s) missing');
    await mkdir(inFolder(root, "assets"), { recursive: true });
    await writeFile(inFolder(root, "assets", "screen.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>\n');
    const art = { id: "ART-02", kind: "screen", format: "svg", title: "Screen", path: "assets/screen.svg", illustrates: ["REQ-001"] };
    expect((await patch(FEATURE, [{ op: "add", path: "/artifacts/-", value: art }], { root })).ok).toBe(true);
    const exigences = await readFile(inFolder(root, "rendered", "requirements.md"), "utf8");
    expect(exigences).toContain("<!-- id: ART-02 -->\n**Screen** (`ART-02`, screen)\n\n![Screen](../assets/screen.svg)");
    expect(exigences.indexOf("<!-- id: ART-02 -->")).toBeLessThan(exigences.indexOf("<!-- id: REQ-002 -->"));
    expect((await advancePhase(FEATURE, { root, now: NOW })).ok).toBe(true);
  });

  it("every result about a feature carries next: the skill and the schema instruction for the moment", async () => {
    const framing = phases.find((p) => p.name === "framing")!;
    const requirements = phases.find((p) => p.name === "requirements")!;
    const root = await workspace();
    await render(FEATURE, { root });
    const incomplete = (await status(FEATURE, { root })).next;
    expect(incomplete).toMatchObject({ phase: "framing", skill: "framing", instruction: framing.instructions.onIncomplete, missing: 5 });
    expect(incomplete.todo[0]).toBe("/framing/questions/0/status: question Q-01 is still open");
    expect((await features({ root }))[0]!.next).toEqual(incomplete);
    const refused = await advancePhase(FEATURE, { root, by: "owner" });
    expect(refused.next.instruction).toBe(framing.instructions.onIncomplete);
    await answered(root);
    const complete = await patch(FEATURE, [{ op: "replace", path: "/framing/intent", value: "Read and write Maket items over HTTP." }], { root });
    expect(complete.next).toEqual({ phase: "framing", skill: "framing", instruction: framing.instructions.beforeLeave, missing: 0, todo: [] });
    const path = inFolder(root, "rendered", "framing.md");
    await writeFile(path, `${await readFile(path, "utf8")}\nOwner note.\n`);
    expect((await status(FEATURE, { root })).next).toMatchObject({ skill: "reconcile", instruction: expect.stringContaining("`reconcile` skill") });
    await reconcile(FEATURE, { ops: [], applied: 1, reported: [] }, { root });
    const moved = await advancePhase(FEATURE, { root, by: "owner" });
    expect(moved.next).toMatchObject({ phase: "requirements", skill: "requirements", instruction: requirements.instructions.onEnter });
    expect((await status(FEATURE, { root })).next.instruction).toBe(requirements.instructions.onIncomplete);
    expect(learn("phases").content).toContain(`- before leaving: ${framing.instructions.beforeLeave}`);
  });

  it("create carries the onEnter instruction of the first phase", async () => {
    const root = await workspace();
    const created = await create("export-csv", "Export CSV", { root, by: "owner", reason: "Needed for the demo." });
    expect(created.next).toMatchObject({ phase: "framing", skill: "framing", instruction: phases[0]!.instructions.onEnter });
  });

  async function inVerification(statuses: (string | undefined)[]) {
    const root = await workspace();
    const feature = inAcceptance(await guineaPig());
    feature.phase = "verification";
    feature.lifecycle = {
      created: NOW,
      phaseHistory: ["framing", "requirements", "acceptance", "anchoring", "verification"].map((phase) => ({ phase, date: NOW, by: "owner" })),
    };
    feature.anchors = [{ id: "ANC-01", kind: "module", path: "src/http.ts", change: "add", realizes: ["REQ-001", "REQ-002"] }];
    feature.tests = statuses.map((status, i) => ({
      file: "test/http.test.ts",
      name: `AC-00${i + 1}.1 case ${i + 1}`,
      framework: "vitest",
      verifies: [`AC-00${i + 1}.1`],
      ...(status ? { status } : {}),
    }));
    await writeFile(inFolder(root, "feature.json"), serializeFeature(feature));
    await render(FEATURE, { root });
    return root;
  }

  it("cannot reach done while a test is missing, and can once every test passes or is justified", async () => {
    const root = await inVerification(["passing", "missing"]);
    const refused = await advancePhase(FEATURE, { root, by: "owner" });
    expect(refused.ok).toBe(false);
    expect(refused.reasons).toEqual([
      'phase "verification" is incomplete: 1 item(s) missing',
      '/tests/1/status: missing: test "AC-002.1 case 2" is not passing',
    ]);
    expect((await status(FEATURE, { root })).phase).toBe("verification");
    const justified = await patch(FEATURE, [
      { op: "add", path: "/tests/1/method", value: "inspection" },
      { op: "add", path: "/tests/1/reason", value: "The stale revision is checked by reading the API log." },
    ], { root });
    expect(justified.ok).toBe(true);
    const closed = await advancePhase(FEATURE, { root, by: "owner", now: NOW });
    expect(closed).toMatchObject({ ok: true, from: "verification", to: "done" });
    expect((await status(FEATURE, { root })).completeness.state).toBe("complete");
  });

  it("moves back to an earlier phase on the owner's decision with a reason, keeping the later sections", async () => {
    const root = await inVerification(["passing", "passing"]);
    expect((await advancePhase(FEATURE, { root, by: "agent", to: "requirements", reason: "x" })).reasons).toContain(
      "a move back to an earlier phase is decided by the owner: pass by owner",
    );
    expect((await advancePhase(FEATURE, { root, by: "owner", to: "requirements" })).reasons).toContain("a move back to an earlier phase needs a reason, in French");
    expect((await advancePhase(FEATURE, { root, by: "owner", to: "verification", reason: "x" })).reasons[0]).toContain("is not an earlier phase");
    const back = await advancePhase(FEATURE, { root, by: "owner", to: "requirements", reason: "REQ-002 must cover deletion.", now: NOW });
    expect(back).toMatchObject({ ok: true, from: "verification", to: "requirements" });
    const json = JSON.parse(await readFile(inFolder(root, "feature.json"), "utf8"));
    expect(json.criteria).toHaveLength(2);
    expect(json.anchors).toHaveLength(1);
    expect(json.tests).toHaveLength(2);
    expect(json.lifecycle.phaseHistory.at(-1)).toEqual({ phase: "requirements", date: NOW, by: "owner", reason: "REQ-002 must cover deletion." });
    expect(back.patch?.render?.files.map((f) => f.path)).toEqual(["index.md", "framing.md", "requirements.md"]);
    expect(back.patch?.render?.removed).toEqual(["anchors.md", "criteria.md", "verification.md"]);
    const s = await status(FEATURE, { root });
    expect(s.lastBackwardMove).toEqual({ from: "verification", to: "requirements", date: NOW, by: "owner", reason: "REQ-002 must cover deletion." });
    expect(s.completeness.state).toBe("complete");
    expect((await advancePhase(FEATURE, { root, by: "owner" })).to).toBe("acceptance");
  });
});
