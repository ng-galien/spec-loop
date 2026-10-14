import { copyFile, mkdir, symlink } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { validate, validateFeature, type Feature } from "../src/lib/index.js";
import { FOLDER, guineaPig, inAcceptance, inFolder, inRequirements, workspace } from "./helpers.js";

const pointers = (feature: unknown, kind?: string) =>
  validate(feature).errors.filter((e) => !kind || e.kind === kind).map((e) => e.pointer);

describe("validate", () => {
  it("framing: reports missing fields with their pointers", async () => {
    const feature = (await guineaPig()) as Feature & { framing: Record<string, unknown> };
    delete feature.framing.actors;
    delete feature.framing.intent;
    const result = validate(feature);
    expect(result.valid).toBe(true);
    expect(result.complete).toBe(false);
    expect(pointers(feature, "incomplete")).toEqual(expect.arrayContaining(["/framing/actors", "/framing/intent"]));
  });

  it("framing: open questions keep the phase incomplete", async () => {
    expect(pointers(await guineaPig())).toEqual([0, 1, 2, 3, 4].map((i) => `/framing/questions/${i}/status`));
  });

  it("framing: a section of a later phase is invalid", async () => {
    const result = validate({ ...(await guineaPig()), requirements: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ pointer: "/requirements", kind: "invalid" }));
  });

  it("requirements: changing the phase lists what is missing", async () => {
    const feature = { ...(await guineaPig()), phase: "requirements" };
    expect(pointers(feature, "incomplete")).toEqual(expect.arrayContaining(["/requirements", "/framing/questions/0/status"]));
    expect(validate(inRequirements(await guineaPig())).complete).toBe(true);
  });

  it("requirements: the statement follows the EARS form of its pattern", async () => {
    const feature = inRequirements(await guineaPig());
    (feature.requirements as { pattern: string }[])[0]!.pattern = "state";
    expect(validate(feature).errors).toContainEqual(expect.objectContaining({ pointer: "/requirements/0/statement", kind: "invalid" }));
    (feature.requirements as { statement: string }[])[1]!.statement = "If the API answers 412, then the connector reports it.";
    expect(validate(feature).errors).toContainEqual(expect.objectContaining({ pointer: "/requirements/1/statement", kind: "invalid" }));
  });

  it("acceptance: each requirement needs a criterion whose id carries its number", async () => {
    const feature = inRequirements(await guineaPig());
    feature.phase = "acceptance";
    expect(pointers(feature, "incomplete")).toEqual(["/criteria", "/requirements/0", "/requirements/1"]);
    const accepted = inAcceptance(await guineaPig());
    expect(validate(accepted).complete).toBe(true);
    (accepted.criteria as unknown[]).pop();
    expect(pointers(accepted, "incomplete")).toEqual(["/requirements/1"]);
    (accepted.criteria as { id: string }[])[0]!.id = "AC-002.1";
    expect(validate(accepted).errors).toContainEqual(expect.objectContaining({ pointer: "/criteria/0/id", kind: "invalid" }));
  });

  it("anchoring and verification: coverage rules report their pointers", async () => {
    const feature = inAcceptance(await guineaPig());
    feature.phase = "anchoring";
    expect(pointers(feature, "incomplete")).toEqual(["/anchors", "/requirements/0", "/requirements/1"]);
    feature.anchors = [{ id: "ANC-01", kind: "symbol", path: "src/http/connector.ts", symbol: "HttpConnector.list", change: "add", realizes: ["REQ-001"] }];
    expect(pointers(feature, "incomplete")).toEqual(["/requirements/1"]);
    feature.phase = "verification";
    feature.tests = [{ file: "test/connector.test.ts", name: "AC-001.1 lists two pages", framework: "vitest", verifies: ["AC-001.1", "AC-002.1"] }];
    expect(validate(feature).errors).toContainEqual(expect.objectContaining({ pointer: "/tests/0/name", kind: "invalid" }));
  });

  it("artifacts: mermaid takes source, svg takes a path under assets/", async () => {
    const feature = await guineaPig();
    (feature.artifacts as unknown[]).push({ id: "ART-02", kind: "screen", format: "svg", title: "Écran", source: "<svg/>", illustrates: [] });
    expect(validate(feature).errors).toContainEqual(expect.objectContaining({ pointer: "/artifacts/1", kind: "invalid" }));
  });

  it("artifacts: a Mermaid source must parse; a broken one is invalid at its artifact", async () => {
    const feature = await guineaPig();
    const artifacts = feature.artifacts as Record<string, unknown>[];
    artifacts.push({ id: "ART-02", kind: "flow", format: "mermaid", title: "Flow", source: "flowchart LR\n  agent --> maket\n  maket --> api", illustrates: [] });
    expect(await validateFeature(feature)).toMatchObject({ valid: true });
    artifacts[1]!.source = "flowchart LR\n  agent --> maket\n  maket -->";
    const broken = await validateFeature(feature);
    expect(broken.valid).toBe(false);
    expect(broken.errors).toContainEqual({ pointer: "/artifacts/1", message: expect.stringMatching(/^ART-02: the Mermaid source does not parse: Parse error on line \d+:/), kind: "invalid" });
    expect(validate(feature).valid).toBe(true);
  });

  it("artifacts: the Mermaid parser leaves no global behind", async () => {
    const feature = await guineaPig();
    await validateFeature(feature);
    expect("window" in globalThis).toBe(false);
    expect("injected" in globalThis).toBe(false);
  });

  it("artifacts: a Mermaid parser that fails to load gives a readable invalid error, and the next validation retries", async () => {
    vi.resetModules();
    vi.doMock("happy-dom", () => {
      throw new Error("no DOM here");
    });
    const { mermaidError } = await import("../src/lib/mermaid.js");
    expect(await mermaidError("flowchart LR\n  a --> b")).toEqual({ kind: "unavailable", message: expect.stringContaining("the Mermaid parser could not be loaded") });
    vi.doUnmock("happy-dom");
    expect(await mermaidError("flowchart LR\n  a --> b")).toBeNull();
    vi.resetModules();
  });

  it("artifacts: the Mermaid kinds spec-loop renders all parse", async () => {
    const sources = [
      "sequenceDiagram\n  agent->>maket: list\n  maket-->>agent: items",
      "stateDiagram-v2\n  [*] --> draft\n  draft --> published",
      "classDiagram\n  ItemSource <|-- HttpConnector",
      "erDiagram\n  WORKSPACE ||--o{ ITEM : holds",
    ];
    for (const source of sources) {
      const feature = await guineaPig();
      (feature.artifacts as unknown[]).push({ id: "ART-02", kind: "flow", format: "mermaid", title: "Diagram", source, illustrates: [] });
      expect((await validateFeature(feature)).valid, source).toBe(true);
    }
  });

  it("rejects duplicate ids and dangling references", async () => {
    const feature = inRequirements(await guineaPig());
    (feature.requirements as { id: string }[])[1]!.id = "REQ-001";
    (feature.requirements as { source: string[] }[])[0]!.source = ["CON-09"];
    const errors = validate(feature).errors;
    expect(errors).toContainEqual(expect.objectContaining({ pointer: "/requirements/1/id", kind: "invalid" }));
    expect(errors).toContainEqual(expect.objectContaining({ pointer: "/requirements/0/source/0", kind: "invalid" }));
  });

  it("requirements: a requirement without facet is incomplete, not invalid", async () => {
    const feature = inRequirements(await guineaPig());
    delete (feature.requirements as { facet?: string }[])[0]!.facet;
    const result = validate(feature);
    expect(result.valid).toBe(true);
    expect(result.errors).toContainEqual(expect.objectContaining({ pointer: "/requirements/0/facet", kind: "incomplete" }));
  });

  it("requirements: an interface requirement waits for its svg screen before leaving the phase", async () => {
    const feature = inRequirements(await guineaPig());
    (feature.requirements as { facet: string }[])[0]!.facet = "interface";
    expect(validate(feature).errors).toEqual([{ pointer: "/requirements/0", message: "REQ-001 needs its screen wireframe", kind: "incomplete" }]);
    (feature.artifacts as unknown[]).push({ id: "ART-02", kind: "screen", format: "ascii", title: "Brouillon", source: "+--+", illustrates: ["REQ-001"] });
    expect(validate(feature).complete).toBe(false);
    (feature.artifacts as unknown[]).push({ id: "ART-03", kind: "screen", format: "svg", title: "Screen", path: "assets/screen.svg", illustrates: ["REQ-001"] });
    expect(validate(feature).complete).toBe(true);
  });

  const withScreen = async (fixture: string | null) => {
    const root = await workspace("requirements");
    await mkdir(inFolder(root, "assets"), { recursive: true });
    if (fixture) await copyFile(resolve(import.meta.dirname, "fixtures", "svg", fixture), inFolder(root, "assets", "screen.svg"));
    const feature = inRequirements(await guineaPig());
    (feature.requirements as { facet: string }[])[0]!.facet = "interface";
    (feature.artifacts as unknown[]).push({ id: "ART-02", kind: "screen", format: "svg", title: "Screen", path: "assets/screen.svg", illustrates: ["REQ-001"] });
    return validateFeature(feature, { folder: FOLDER, options: { root } });
  };

  it("svg: a stored feature's screen must be a well-formed svg file in the SVG namespace, sized, without script", async () => {
    expect(await withScreen("screen.svg")).toMatchObject({ valid: true, complete: true });
    expect(await withScreen("sized.svg")).toMatchObject({ valid: true, complete: true });
    const cases: [string | null, string][] = [
      [null, "ART-02: assets/screen.svg does not exist in spec/FEAT-001-maket-http-connector/; write the file before declaring it"],
      ["malformed.svg", "ART-02: assets/screen.svg is not well-formed XML: Expected closing tag 'rect' (opened in line 1, col 64) instead of closing tag 'svg'. (line 1)"],
      ["html.svg", "ART-02: assets/screen.svg has root element <html>, not <svg>"],
      ["no-namespace.svg", 'ART-02: assets/screen.svg root <svg> is not in the SVG namespace (xmlns="http://www.w3.org/2000/svg")'],
      ["no-size.svg", "ART-02: assets/screen.svg root <svg> needs a viewBox, or a width and a height"],
      ["script.svg", "ART-02: assets/screen.svg contains a <script> element"],
      ["onclick.svg", "ART-02: assets/screen.svg contains an event attribute onclick on <rect>"],
    ];
    for (const [fixture, message] of cases) {
      const result = await withScreen(fixture);
      expect(result.valid, String(fixture)).toBe(false);
      expect(result.errors).toEqual([
        { pointer: "/artifacts/1", message, kind: "invalid" },
        { pointer: "/requirements/0", message: "REQ-001 needs its screen wireframe: ART-02 is missing or invalid", kind: "incomplete" },
      ]);
    }
  });

  it("svg: a screen path may not leave the feature folder, by .., absolute path or symbolic link", async () => {
    const root = await workspace("requirements");
    await mkdir(inFolder(root, "assets"), { recursive: true });
    const outside = resolve(root, "outside.svg");
    await copyFile(resolve(import.meta.dirname, "fixtures", "svg", "screen.svg"), outside);
    await symlink(outside, inFolder(root, "assets", "link.svg"));
    const check = async (path: string) => {
      const feature = inRequirements(await guineaPig());
      (feature.artifacts as unknown[]).push({ id: "ART-02", kind: "screen", format: "svg", title: "Screen", path, illustrates: [] });
      return (await validateFeature(feature, { folder: FOLDER, options: { root } })).errors.filter((e) => e.kind === "invalid");
    };
    expect(await check("assets/../../../outside.svg")).toEqual([{ pointer: "/artifacts/1", message: "ART-02: assets/../../../outside.svg is outside the feature folder", kind: "invalid" }]);
    expect(await check("assets/link.svg")).toEqual([{ pointer: "/artifacts/1", message: "ART-02: assets/link.svg is outside the feature folder", kind: "invalid" }]);
    expect(await check(outside)).toContainEqual(expect.objectContaining({ pointer: "/artifacts/1", message: `ART-02: ${outside} is outside the feature folder` }));
  });

  it("svg: a bare candidate object is not checked against files", async () => {
    const feature = inRequirements(await guineaPig());
    (feature.artifacts as unknown[]).push({ id: "ART-02", kind: "screen", format: "svg", title: "Screen", path: "assets/none.svg", illustrates: [] });
    expect((await validateFeature(feature)).valid).toBe(true);
  });

  it("framing: the screen rule is not checked yet", async () => {
    const feature = await guineaPig();
    expect(validate(feature).errors.every((e) => !e.message.includes("wireframe"))).toBe(true);
  });

  const verified = async () => {
    const feature = inAcceptance(await guineaPig());
    feature.phase = "verification";
    feature.anchors = [{ id: "ANC-01", kind: "module", path: "src/http.ts", change: "add", realizes: ["REQ-001", "REQ-002"] }];
    feature.tests = [
      { file: "test/http.test.ts", name: "AC-001.1 lists two pages", framework: "vitest", verifies: ["AC-001.1"], status: "passing" },
      { file: "test/http.test.ts", name: "AC-002.1 reports a stale revision", framework: "vitest", verifies: ["AC-002.1"], status: "passing" },
    ];
    return feature;
  };

  it("acceptance: a requirement without criterion is reported with its pointer", async () => {
    const feature = inAcceptance(await guineaPig());
    (feature.criteria as unknown[]).shift();
    expect(validate(feature).errors).toEqual([{ pointer: "/requirements/0", message: "missing: requirement REQ-001 has no criterion", kind: "incomplete" }]);
  });

  it("verification: every criterion has a test, and a test name starts with the id of a criterion it verifies", async () => {
    const feature = await verified();
    expect(validate(feature).complete).toBe(true);
    (feature.tests as unknown[]).pop();
    expect(validate(feature).errors).toEqual([{ pointer: "/criteria/1", message: "missing: criterion AC-002.1 is verified by no test", kind: "incomplete" }]);
    (feature.tests as { name: string; verifies: string[] }[])[0]!.name = "lists two pages AC-001.1";
    expect(validate(feature).errors).toContainEqual({ pointer: "/tests/0/name", message: "test name must start with the id of a criterion it verifies (AC-001.1)", kind: "invalid" });
    (feature.tests as { name: string }[])[0]!.name = "test_ac_001_1_lists_two_pages";
    expect(validate(feature).errors.filter((e) => e.pointer.startsWith("/tests"))).toEqual([]);
  });

  it("done: every test passes, or uses another method with its reason", async () => {
    const feature = await verified();
    feature.phase = "done";
    expect(validate(feature).complete).toBe(true);
    const tests = feature.tests as Record<string, unknown>[];
    tests[0]!.status = "failing";
    expect(validate(feature).errors).toEqual([{ pointer: "/tests/0/status", message: 'missing: test "AC-001.1 lists two pages" is not passing', kind: "incomplete" }]);
    tests[0]!.method = "inspection";
    delete tests[0]!.status;
    expect(validate(feature).errors).toEqual([expect.objectContaining({ pointer: "/tests/0/reason", kind: "incomplete" })]);
    tests[0]!.reason = "The screen layout is checked by eye against the wireframe.";
    expect(validate(feature).complete).toBe(true);
  });

  it("verification phase: the closing rule is an entry gate, so a test not passing already keeps the phase incomplete", async () => {
    const feature = await verified();
    (feature.tests as Record<string, unknown>[])[0]!.status = "failing";
    expect(validate(feature).errors).toEqual([{ pointer: "/tests/0/status", message: 'missing: test "AC-001.1 lists two pages" is not passing', kind: "incomplete" }]);
  });

  it("tolerates sections of phases already reached after a move back", async () => {
    const feature = await verified();
    feature.phase = "requirements";
    expect(validate(feature).valid).toBe(false);
    feature.lifecycle = {
      created: "2026-10-14T10:00:00.000Z",
      phaseHistory: ["framing", "requirements", "acceptance", "anchoring", "verification"].map((phase) => ({ phase, date: "2026-10-14T10:00:00.000Z", by: "owner" })).concat([
        { phase: "requirements", date: "2026-10-14T11:00:00.000Z", by: "owner", reason: "Review REQ-002." } as never,
      ]),
    };
    expect(validate(feature)).toMatchObject({ valid: true, complete: true });
  });
});
