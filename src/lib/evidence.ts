import { loadFeature } from "./model.js";
import type { Location } from "./paths.js";
import { patchFolder } from "./patch.js";
import type { HookRun } from "./project.js";

export const RUNS_KEPT = 10;

export function keepRecent(runs: HookRun[]): HookRun[] {
  const seen = new Map<string, number>();
  const kept: HookRun[] = [];
  for (const run of [...runs].reverse()) {
    const key = `${run.phase}\u0000${run.title}`;
    const count = seen.get(key) ?? 0;
    if (count >= RUNS_KEPT) continue;
    seen.set(key, count + 1);
    kept.push(run);
  }
  return kept.reverse();
}

export function hookFailure(run: HookRun): string {
  const last = run.output.trimEnd().split("\n").at(-1) ?? "";
  return `project hook "${run.title}" (${run.run}) ${run.exitCode === null ? "did not finish" : `exited with ${run.exitCode}`}${last ? `: ${last}` : ""}`;
}

export async function recordRuns(folder: string, runs: HookRun[], options: Location & { now?: string }): Promise<string | null> {
  if (runs.length === 0) return null;
  try {
    const json = await loadFeature(folder, options);
    const existing = (json.lifecycle as { hookRuns?: unknown } | undefined)?.hookRuns;
    const all = keepRecent([...(Array.isArray(existing) ? (existing as HookRun[]) : []), ...runs]);
    const op = Array.isArray(existing) ? ("replace" as const) : ("add" as const);
    const result = await patchFolder(folder, [{ op, path: "/lifecycle/hookRuns", value: all }], { ...options, allowProtected: true, evidence: true });
    if (!result.ok) return `the hook runs could not be recorded: ${result.errors.map((e) => `${e.pointer}: ${e.message}`).join("; ")}`;
    return null;
  } catch (error) {
    return `the hook runs could not be recorded: ${(error as Error).message}`;
  }
}
