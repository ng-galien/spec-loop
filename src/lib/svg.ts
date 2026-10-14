import { XMLParser, XMLValidator } from "fast-xml-parser";

const SVG_NS = "http://www.w3.org/2000/svg";
const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: "", processEntities: false, ignoreDeclaration: true, ignorePiTags: true });

type Node = Record<string, unknown>;
const ATTRS = ":@";
const localName = (name: string) => name.slice(name.indexOf(":") + 1);
const elementName = (node: Node) => Object.keys(node).find((k) => k !== ATTRS && k !== "#text" && !k.startsWith("?") && !k.startsWith("!"));

export function svgProblem(text: string): string | null {
  const wellFormed = XMLValidator.validate(text);
  if (wellFormed !== true) return `is not well-formed XML: ${wellFormed.err.msg} (line ${wellFormed.err.line})`;
  const nodes = parser.parse(text) as Node[];
  const roots = nodes.filter((n) => elementName(n));
  if (roots.length !== 1) return "must have exactly one root element";
  const root = roots[0]!;
  const rootName = elementName(root)!;
  const rootAttrs = (root[ATTRS] ?? {}) as Record<string, string>;
  const prefix = rootName.includes(":") ? rootName.slice(0, rootName.indexOf(":")) : null;
  if (localName(rootName) !== "svg") return `has root element <${rootName}>, not <svg>`;
  if (rootAttrs[prefix ? `xmlns:${prefix}` : "xmlns"] !== SVG_NS) return `root <svg> is not in the SVG namespace (xmlns="${SVG_NS}")`;
  if (!rootAttrs.viewBox && !(rootAttrs.width && rootAttrs.height)) return "root <svg> needs a viewBox, or a width and a height";
  const problems: string[] = [];
  const walk = (node: Node) => {
    const name = elementName(node);
    if (!name) return;
    if (localName(name).toLowerCase() === "script") problems.push("contains a <script> element");
    for (const attr of Object.keys((node[ATTRS] ?? {}) as Record<string, string>)) {
      if (/^on/i.test(localName(attr))) problems.push(`contains an event attribute ${attr} on <${name}>`);
    }
    for (const child of (node[name] ?? []) as Node[]) walk(child);
  };
  walk(root);
  return problems.length ? [...new Set(problems)].join("; ") : null;
}
