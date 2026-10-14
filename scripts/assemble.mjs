#!/usr/bin/env node
// Assembles skills/<name>/SKILL.md from skills-src/ and copies them to every distribution target.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const TARGETS = ["skills", "examples/consumer/.agents/skills"];

export function parseSkillYaml(text, file) {
  const out = {};
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const m = /^([a-z_]+):(?: (.*))?$/.exec(line);
    if (!m) throw new Error(`${file}:${i + 1}: expected "key: value"`);
    const [, key, value] = m;
    if (value === "|") {
      const block = [];
      while (i + 1 < lines.length && (lines[i + 1].startsWith("  ") || lines[i + 1] === "")) block.push(lines[++i].slice(2));
      out[key] = block.join("\n").replace(/\n+$/, "");
    } else if (value === undefined || value === "") {
      const items = [];
      while (i + 1 < lines.length && lines[i + 1].startsWith("  - ")) items.push(lines[++i].slice(4).trim());
      out[key] = items;
    } else {
      out[key] = value;
    }
  }
  for (const key of ["name", "description", "phase", "parts"]) if (out[key] === undefined) throw new Error(`${file}: missing "${key}"`);
  return out;
}

export function assemble(root = repoRoot) {
  const src = join(root, "skills-src");
  const parts = Object.fromEntries(
    readdirSync(join(src, "parts"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => [f.slice(0, -3), readFileSync(join(src, "parts", f), "utf8").trim()]),
  );
  const skills = [];
  for (const name of readdirSync(src).filter((d) => d !== "parts" && existsSync(join(src, d, "skill.yaml"))).sort()) {
    const yamlFile = `skills-src/${name}/skill.yaml`;
    const meta = parseSkillYaml(readFileSync(join(src, name, "skill.yaml"), "utf8"), yamlFile);
    if (meta.name !== name) throw new Error(`${yamlFile}: name "${meta.name}" must equal the folder name`);
    const body = readFileSync(join(src, name, "body.md"), "utf8");
    const used = [...body.matchAll(/\{\{> (\w+)\}\}/g)].map((m) => m[1]);
    if (used.join(",") !== meta.parts.join(",")) {
      throw new Error(`${yamlFile}: parts [${meta.parts.join(", ")}] do not match the markers of body.md [${used.join(", ")}]`);
    }
    let text = body.replace(/\{\{> (\w+)\}\}/g, (_, part) => {
      if (parts[part] === undefined) throw new Error(`${yamlFile}: unknown part "${part}"`);
      return parts[part];
    });
    if (text.includes("{{patch_example}}")) {
      if (!meta.patch_example) throw new Error(`${yamlFile}: the model part needs patch_example`);
      text = text.replace("{{patch_example}}", meta.patch_example);
    }
    const content = `---\nname: ${meta.name}\ndescription: ${meta.description}\n---\n<!-- Generated from skills-src/${name}; do not edit -->\n\n${text.trim()}\n`;
    skills.push({ name, content });
  }
  return skills;
}

export function write(skills, root = repoRoot) {
  const names = new Set(skills.map((s) => s.name));
  for (const target of TARGETS) {
    const dir = join(root, target);
    mkdirSync(dir, { recursive: true });
    for (const entry of readdirSync(dir)) if (!names.has(entry)) rmSync(join(dir, entry), { recursive: true, force: true });
    for (const skill of skills) {
      mkdirSync(join(dir, skill.name), { recursive: true });
      writeFileSync(join(dir, skill.name, "SKILL.md"), skill.content);
    }
  }
}

function checkMethodShipped(root) {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  if (!(pkg.files ?? []).includes("method")) throw new Error('package.json "files" must include "method": learn reads method/*.md at run time');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkMethodShipped(repoRoot);
  const skills = assemble();
  write(skills);
  console.log(`assembled ${skills.length} skills into ${TARGETS.join(", ")}`);
}
