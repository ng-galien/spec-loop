import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { structuredPatch } from "diff";
import { indexIds, loadFeature, resolveFeature } from "./model.js";
import { featureFile, renderedDir, type Location } from "./paths.js";
import { assetHashes, listRenderedOnDisk, parseHeader, readManifest, renderToMemory, sha256 } from "./render.js";
import type { Alteration, DiffResult, Feature, FileDiff, Hunk, Target } from "./types.js";
import { validate } from "./validate.js";

const ID_MARKER = /<!-- id: ([A-Z]+-[0-9]+(?:\.[0-9]+)?) -->/g;
const PTR_MARKER = /<!-- ptr: (\/[^ ]*) -->/;

function markersIn(line: string): string[] {
  return [...line.matchAll(ID_MARKER)].map((m) => m[1]!);
}

function targetOfLine(line: string, ids: Map<string, string[]>): Target | null {
  const id = markersIn(line)[0];
  if (id) return { id, pointer: ids.get(id)?.[0] ?? null };
  const ptr = PTR_MARKER.exec(line);
  if (ptr) return { id: null, pointer: ptr[1]! };
  return null;
}

function enclosing(lines: string[], index: number, fallback: Target, ids: Map<string, string[]>): Target {
  for (let i = Math.min(index, lines.length - 1); i >= 0; i--) {
    const target = targetOfLine(lines[i]!, ids);
    if (target) return target;
  }
  return fallback;
}

function navigationLines(lines: string[]): Set<number> {
  const inside = new Set<number>();
  let open = -1;
  lines.forEach((line, i) => {
    if (line === "<!-- nav -->") open = i;
    else if (line === "<!-- /nav -->" && open >= 0) {
      for (let k = open; k <= i; k++) inside.add(k);
      open = -1;
    }
  });
  return inside;
}

function mapHunks(expected: string, actual: string, path: string, fallback: Target, ids: Map<string, string[]>): Hunk[] {
  const lines = expected.split("\n");
  const navigation = navigationLines(lines);
  const patch = structuredPatch(path, path, expected, actual, "", "", { context: 0 });
  return patch.hunks.map((hunk) => {
    const firstOld = hunk.oldLines === 0 ? hunk.oldStart : hunk.oldStart - 1;
    const anchorLine = hunk.oldLines === 0 ? firstOld - 1 : firstOld;
    const inNavigation = navigation.has(anchorLine) || (hunk.oldLines === 0 && navigation.has(firstOld));
    const target = inNavigation ? { id: null, pointer: null } : enclosing(lines, anchorLine, fallback, ids);
    const touches: Target[] = [];
    const seen = new Set([`${target.id}|${target.pointer}`]);
    for (let i = firstOld; i < firstOld + hunk.oldLines; i++) {
      if (navigation.has(i)) continue;
      const t = targetOfLine(lines[i] ?? "", ids);
      if (t && !seen.has(`${t.id}|${t.pointer}`)) {
        seen.add(`${t.id}|${t.pointer}`);
        touches.push(t);
      }
    }
    const added = hunk.lines.filter((l) => l.startsWith("+")).flatMap(markersIn);
    const removed = hunk.lines.filter((l) => l.startsWith("-")).flatMap(markersIn);
    return {
      oldStart: hunk.oldStart,
      oldLines: hunk.oldLines,
      newStart: hunk.newStart,
      newLines: hunk.newLines,
      lines: hunk.lines,
      target,
      touches,
      addedIds: added.filter((id) => !removed.includes(id)),
      removedIds: removed.filter((id) => !added.includes(id)),
      newIds: added.filter((id) => !ids.has(id)),
    };
  });
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

const idsOf = (hunks: Hunk[]): string[] =>
  [...new Set(hunks.flatMap((h) => [h.target.id, ...h.touches.map((t) => t.id), ...h.addedIds, ...h.removedIds]).filter((id): id is string => !!id))].sort();

export async function diffFolder(folder: string, options: Location = {}): Promise<DiffResult> {
  const raw = await readFile(featureFile(folder, options), "utf8");
  const manifest = await readManifest(folder, options);
  const alterations: Alteration[] = [];
  let json: Feature;
  try {
    json = JSON.parse(raw) as Feature;
  } catch (error) {
    return {
      feature: folder,
      clean: false,
      ownerEdits: { files: 1, hunks: 1, ids: [] },
      alterations: [{ kind: "feature-changed", path: "feature.json", ids: [], message: `feature.json is not valid JSON: ${(error as Error).message}`, errors: [] }],
      files: [],
    };
  }
  if (manifest?.feature && manifest.feature.hash !== sha256(raw)) {
    const validation = validate(json);
    alterations.push({
      kind: "feature-changed",
      path: "feature.json",
      ids: [],
      message: validation.valid ? "feature.json was changed outside the MCP; it is valid" : "feature.json was changed outside the MCP and breaks the schema",
      errors: validation.errors.filter((e) => e.kind === "invalid"),
    });
  }
  const ids = indexIds(json);
  const expected = renderToMemory(json);
  const base = renderedDir(folder, options);
  const files: FileDiff[] = [];
  const known = new Set<string>();
  const entry = (path: string, partial: Partial<FileDiff>): FileDiff => ({
    path,
    artifact: null,
    review: null,
    source: null,
    template: null,
    status: "unchanged",
    editedByOwner: null,
    hunks: [],
    ...partial,
  });
  for (const file of expected) {
    known.add(file.path);
    const disk = await readOptional(join(base, file.path));
    const fallback: Target = { id: null, pointer: file.source };
    const edited = disk === null ? null : manifest ? manifest.files[file.path]?.hash !== sha256(disk) : null;
    const common = { source: file.source, template: file.template };
    if (disk === null) {
      files.push(entry(file.path, { ...common, status: "missing" }));
      if (manifest?.files[file.path]) {
        alterations.push({ kind: "rendered-missing", path: `rendered/${file.path}`, ids: [], message: "rendered file deleted by hand" });
      }
    } else if (disk === file.content) {
      files.push(entry(file.path, { ...common, editedByOwner: edited }));
    } else {
      const hunks = mapHunks(file.content, disk, file.path, fallback, ids);
      files.push(entry(file.path, { ...common, status: "modified", editedByOwner: edited, hunks }));
      if (edited !== false) {
        alterations.push({ kind: "rendered-changed", path: `rendered/${file.path}`, ids: idsOf(hunks), message: `${hunks.length} hunk(s) edited in the rendered file`, hunks: hunks.length });
      }
    }
  }
  for (const path of await listRenderedOnDisk(folder, options)) {
    if (known.has(path)) continue;
    const disk = (await readOptional(join(base, path))) ?? "";
    if (manifest?.files[path] && manifest.files[path].hash === sha256(disk)) {
      files.push(entry(path, { status: "unexpected", editedByOwner: false }));
      continue;
    }
    const head = parseHeader(disk.split("\n")[0] ?? "");
    const hunks = mapHunks("", disk, path, { id: null, pointer: head?.source ?? null }, ids);
    files.push(entry(path, { source: head?.source ?? null, template: head?.template ?? null, status: "unexpected", editedByOwner: true, hunks }));
    alterations.push({ kind: "rendered-extra", path: `rendered/${path}`, ids: idsOf(hunks), message: "file added by hand in rendered/" });
  }
  const artifacts = (Array.isArray(json.artifacts) ? json.artifacts : []) as { id?: string; path?: string }[];
  for (const [path, hash] of Object.entries(await assetHashes(folder, json, options))) {
    const known = manifest?.assets[path]?.hash;
    const id = artifacts.find((a) => a.path === path)?.id ?? null;
    const review = "artifact changed, review visually";
    if (hash === null) {
      files.push(entry(path, { artifact: id, status: "missing" }));
      alterations.push({ kind: "asset-changed", path, ids: id ? [id] : [], message: "asset file missing" });
    } else if (known !== undefined && known !== hash) {
      files.push(entry(path, { artifact: id, review, status: "modified", editedByOwner: true }));
      alterations.push({ kind: "asset-changed", path, ids: id ? [id] : [], message: review });
    }
  }
  const pending = alterations;
  return {
    feature: folder,
    clean: alterations.length === 0 && files.every((f) => f.status === "unchanged"),
    ownerEdits: {
      files: pending.length,
      hunks: pending.reduce((n, a) => n + (a.hunks ?? 1), 0),
      ids: [...new Set(pending.flatMap((a) => a.ids))].sort(),
    },
    alterations,
    files,
  };
}

export async function diff(ref: string, options: Location = {}): Promise<DiffResult> {
  return diffFolder(await resolveFeature(ref, options), options);
}

export { loadFeature };
