import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { advancePhase, patch, phases, render, status } from "../src/lib/index.js";
import { loadProject } from "../src/lib/project.js";
import { FEATURE, inFolder, workspace } from "./helpers.js";

const NOW = "2026-10-14T12:00:00.000Z";
const framing = phases.find((p) => p.name === "framing")!;

async function completeFraming(project: unknown): Promise<string> {
  const root = await workspace();
  await writeFile(join(root, "spec", "spec-loop.json"), JSON.stringify(project));
  await render(FEATURE, { root });
  const ops = [0, 1, 2, 3, 4].flatMap((i) => [
    { op: "replace" as const, path: `/framing/questions/${i}/status`, value: "answered" },
    { op: "add" as const, path: `/framing/questions/${i}/answer`, value: "Recommendation accepted." },
  ]);
  expect((await patch(FEATURE, ops, { root })).ok).toBe(true);
  return root;
}

const feature = async (root: string) => JSON.parse(await readFile(inFolder(root, "feature.json"), "utf8"));

describe("project hooks", () => {
  it("a failing beforeLeave hook blocks the move and is recorded; a passing one lets it through", async () => {
    const root = await completeFraming({
      hooks: [{ phase: "framing", on: "beforeLeave", run: "echo checking; echo 'bad scope' >&2; test -f ok.flag", title: "Scope check", timeout: 10 }],
    });
    const refused = await advancePhase(FEATURE, { root, by: "owner", now: NOW });
    expect(refused.ok).toBe(false);
    expect(refused.reasons).toEqual(['project hook "Scope check" (echo checking; echo \'bad scope\' >&2; test -f ok.flag) exited with 1: bad scope']);
    expect(refused.hooks).toEqual([
      { phase: "framing", on: "beforeLeave", title: "Scope check", run: expect.any(String), date: NOW, exitCode: 1, durationMs: expect.any(Number), output: "checking\nbad scope\n" },
    ]);
    expect((await feature(root)).phase).toBe("framing");
    expect((await feature(root)).lifecycle.hookRuns).toHaveLength(1);
    expect((await status(FEATURE, { root })).hooks).toEqual([
      { phase: "framing", on: "beforeLeave", title: "Scope check", run: expect.any(String), lastRun: { date: NOW, exitCode: 1, durationMs: expect.any(Number) } },
    ]);
    expect((await status(FEATURE, { root })).next.instruction).toContain('Before the move, `phase` runs the project hooks "Scope check"');

    await writeFile(join(root, "ok.flag"), "");
    const moved = await advancePhase(FEATURE, { root, by: "owner", now: NOW });
    expect(moved).toMatchObject({ ok: true, from: "framing", to: "requirements", hooks: [{ exitCode: 0 }] });
    expect((await feature(root)).lifecycle.hookRuns.map((r: { exitCode: number }) => r.exitCode)).toEqual([1, 0]);
  });

  it("an onEnter hook runs after the move; its failure is recorded and does not undo the move", async () => {
    const root = await completeFraming({ hooks: [{ phase: "requirements", on: "onEnter", run: "echo entered; exit 3" }] });
    const moved = await advancePhase(FEATURE, { root, by: "owner", now: NOW });
    expect(moved.ok).toBe(true);
    expect(moved.hooks).toEqual([expect.objectContaining({ phase: "requirements", on: "onEnter", title: "echo entered; exit 3", exitCode: 3, output: "entered\n" })]);
    expect(moved.next.instruction).toMatch(/^project hook "echo entered; exit 3" \(echo entered; exit 3\) exited with 3: entered on entering "requirements"; the move stands/);
    const json = await feature(root);
    expect(json.phase).toBe("requirements");
    expect(json.lifecycle.hookRuns).toEqual([expect.objectContaining({ exitCode: 3 })]);
  });

  it("stops a hook at its timeout and counts it as failed", async () => {
    const root = await completeFraming({ hooks: [{ phase: "framing", on: "beforeLeave", run: "sleep 5", timeout: 1, title: "Slow" }] });
    const refused = await advancePhase(FEATURE, { root, by: "owner", now: NOW });
    expect(refused.ok).toBe(false);
    expect(refused.hooks[0]).toMatchObject({ exitCode: null, output: "[stopped after 1 s]" });
    expect(refused.reasons[0]).toBe('project hook "Slow" (sleep 5) did not finish: [stopped after 1 s]');
  });

  it("appends project instructions to next.instruction", async () => {
    const root = await completeFraming({ instructions: { framing: { beforeLeave: "Check the scope against docs/roadmap.md." } } });
    expect((await status(FEATURE, { root })).next.instruction).toBe(`${framing.instructions.beforeLeave} Project: Check the scope against docs/roadmap.md.`);
  });

  it("renders the runs in verification.md once the feature reaches verification", async () => {
    const root = await completeFraming({ hooks: [{ phase: "framing", on: "beforeLeave", run: "echo a | cat", title: "Pipe" }] });
    await advancePhase(FEATURE, { root, by: "owner", now: NOW });
    const json = await feature(root);
    const { serializeFeature } = await import("../src/lib/model.js");
    const { inAcceptance } = await import("./helpers.js");
    const later = { ...inAcceptance(json), phase: "verification" } as Record<string, unknown>;
    later.anchors = [{ id: "ANC-01", kind: "module", path: "src/http.ts", change: "add", realizes: ["REQ-001", "REQ-002"] }];
    later.tests = [];
    (later.lifecycle as { phaseHistory: unknown[] }).phaseHistory.push(...["acceptance", "anchoring", "verification"].map((phase) => ({ phase, date: NOW, by: "owner" })));
    await writeFile(inFolder(root, "feature.json"), serializeFeature(later));
    await render(FEATURE, { root, force: true });
    const page = await readFile(inFolder(root, "rendered", "verification.md"), "utf8");
    expect(page).toContain("<!-- ptr: /lifecycle/hookRuns -->\n## Project hooks");
    expect(page).toMatch(/\| 2026-10-14 12:00 \| Framing \| before leaving \| Pipe \| `echo a \\\| cat` \| passed \| \d+\.\d s \|/);
  });

  it("refuses every move while spec/spec-loop.json is invalid", async () => {
    const root = await completeFraming({ hooks: [{ phase: "framng", on: "beforeLeave", run: "true" }], extra: 1 });
    expect(loadProject({ root }).errors).toEqual(["spec/spec-loop.json: must NOT have additional properties"]);
    const refused = await advancePhase(FEATURE, { root, by: "owner" });
    expect(refused.ok).toBe(false);
    expect(refused.reasons).toEqual(["spec/spec-loop.json: must NOT have additional properties"]);
    expect((await status(FEATURE, { root })).next.instruction).toContain("spec/spec-loop.json is invalid");
    await writeFile(join(root, "spec", "spec-loop.json"), JSON.stringify({ hooks: [{ phase: "framng", on: "beforeLeave", run: "true" }] }));
    expect(loadProject({ root }).errors).toEqual(['spec/spec-loop.json /hooks/0/phase: unknown phase "framng"']);
  });
});
