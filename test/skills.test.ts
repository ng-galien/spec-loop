import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TARGETS, assemble, repoRoot } from "../scripts/assemble.mjs";

async function read(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

describe("skills assembly", () => {
  it("the committed skills and their copies match their source in skills-src", async () => {
    const stale: string[] = [];
    for (const skill of assemble()) {
      for (const target of TARGETS) {
        const path = join(target, skill.name, "SKILL.md");
        if ((await read(join(repoRoot, path))) !== skill.content) stale.push(path);
      }
    }
    expect(stale, `stale generated skills, run npm run assemble: ${stale.join(", ")}`).toEqual([]);
  });

  it("every skill starts with its frontmatter and the generated-file comment, and has no unresolved marker", () => {
    for (const skill of assemble()) {
      expect(skill.content.startsWith(`---\nname: ${skill.name}\ndescription: `)).toBe(true);
      expect(skill.content).toContain(`---\n<!-- Generated from skills-src/${skill.name}; do not edit -->\n`);
      expect(skill.content).not.toMatch(/\{\{/);
    }
  });

  it("refuses a body whose part markers do not follow skill.yaml", async () => {
    const root = await mkdtemp(join(tmpdir(), "spec-loop-skills-"));
    await cp(join(repoRoot, "skills-src"), join(root, "skills-src"), { recursive: true });
    const body = join(root, "skills-src", "done", "body.md");
    await writeFile(body, (await readFile(body, "utf8")).replace("{{> refusal}}", ""));
    expect(() => assemble(root)).toThrow(/parts \[preamble, model, refusal, stop\] do not match/);
  });
});
