export const repoRoot: string;
export const TARGETS: string[];
export function parseSkillYaml(text: string, file: string): Record<string, string | string[]>;
export function assemble(root?: string): { name: string; content: string }[];
export function write(skills: { name: string; content: string }[], root?: string): void;
