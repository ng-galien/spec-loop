import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { packageRoot, specDir, workspaceRoot, type Location } from "./paths.js";
import { phaseIndex } from "./schema.js";

export type HookMoment = "beforeLeave" | "onEnter";

export interface ProjectHook {
  phase: string;
  on: HookMoment;
  run: string;
  timeout?: number;
  title?: string;
}

export interface ProjectConfig {
  hooks: ProjectHook[];
  instructions: Record<string, { onEnter?: string; beforeLeave?: string }>;
}

export interface Project {
  path: string;
  present: boolean;
  config: ProjectConfig;
  errors: string[];
}

export interface HookRun {
  phase: string;
  on: HookMoment;
  title: string;
  run: string;
  date: string;
  exitCode: number | null;
  durationMs: number;
  output: string;
}

export const PROJECT_FILE = "spec-loop.json";
export const DEFAULT_TIMEOUT = 120;
export const OUTPUT_LIMIT = 4000;

export const projectSchemaPath = join(packageRoot, "schema", "project.schema.json");
const checkProject = new Ajv2020({ allErrors: true, strict: false }).compile(JSON.parse(readFileSync(projectSchemaPath, "utf8")) as object);

const EMPTY: ProjectConfig = { hooks: [], instructions: {} };

export function loadProject(options: Location = {}): Project {
  const path = join(specDir(options), PROJECT_FILE);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return { path, present: false, config: EMPTY, errors: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { path, present: true, config: EMPTY, errors: [`spec/${PROJECT_FILE} is not valid JSON: ${(error as Error).message}`] };
  }
  const errors: string[] = [];
  if (!checkProject(parsed)) {
    for (const e of checkProject.errors ?? []) errors.push(`spec/${PROJECT_FILE}${e.instancePath ? ` ${e.instancePath}` : ""}: ${e.message ?? e.keyword}`);
    return { path, present: true, config: EMPTY, errors };
  }
  const config = parsed as Partial<ProjectConfig>;
  const hooks = config.hooks ?? [];
  const instructions = config.instructions ?? {};
  hooks.forEach((h, i) => {
    if (phaseIndex(h.phase) < 0) errors.push(`spec/${PROJECT_FILE} /hooks/${i}/phase: unknown phase "${h.phase}"`);
  });
  for (const phase of Object.keys(instructions)) {
    if (phaseIndex(phase) < 0) errors.push(`spec/${PROJECT_FILE} /instructions/${phase}: unknown phase "${phase}"`);
  }
  return { path, present: true, config: errors.length ? EMPTY : { hooks, instructions }, errors };
}

export const hooksFor = (project: Project, phase: string | null, on: HookMoment): ProjectHook[] =>
  project.config.hooks.filter((h) => h.phase === phase && h.on === on);

export const hookTitle = (hook: ProjectHook): string => hook.title ?? hook.run;

function truncate(text: string): string {
  return text.length <= OUTPUT_LIMIT ? text : `…${text.slice(text.length - OUTPUT_LIMIT + 1)}`;
}

export function runHook(hook: ProjectHook, options: Location & { now?: string } = {}): Promise<HookRun> {
  const timeout = hook.timeout ?? DEFAULT_TIMEOUT;
  const date = options.now ?? new Date().toISOString();
  const started = performance.now();
  return new Promise((resolve) => {
    let output = "";
    let timedOut = false;
    const child = spawn(hook.run, { shell: true, cwd: workspaceRoot(options), detached: true, stdio: ["ignore", "pipe", "pipe"] });
    const collect = (chunk: Buffer) => {
      output += chunk.toString("utf8");
      if (output.length > OUTPUT_LIMIT * 4) output = output.slice(output.length - OUTPUT_LIMIT * 2);
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    const killGroup = () => {
      try {
        process.kill(-child.pid!, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };
    let done = false;
    const finish = (exitCode: number | null, extra = "") => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearTimeout(grace);
      killGroup();
      child.stdout.destroy();
      child.stderr.destroy();
      resolve({
        phase: hook.phase,
        on: hook.on,
        title: hookTitle(hook),
        run: hook.run,
        date,
        exitCode,
        durationMs: Math.round(performance.now() - started),
        output: truncate(`${output}${extra && output && !output.endsWith("\n") ? "\n" : ""}${extra}`),
      });
    };
    let grace: NodeJS.Timeout | undefined;
    const timer = setTimeout(() => {
      timedOut = true;
      finish(null, `[stopped after ${timeout} s]`);
    }, timeout * 1000);
    child.on("error", (error) => finish(null, `[could not start: ${error.message}]`));
    child.on("exit", (code) => {
      if (timedOut) return;
      let closed = false;
      child.on("close", () => {
        closed = true;
        finish(code);
      });
      if (!closed) grace = setTimeout(() => finish(code), 200);
    });
  });
}

export async function runHooks(hooks: ProjectHook[], options: Location & { now?: string } = {}): Promise<HookRun[]> {
  const runs: HookRun[] = [];
  for (const hook of hooks) runs.push(await runHook(hook, options));
  return runs;
}

export const passed = (run: HookRun): boolean => run.exitCode === 0;
