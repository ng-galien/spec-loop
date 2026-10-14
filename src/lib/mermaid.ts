interface MermaidApi {
  initialize(config: Record<string, unknown>): void;
  parse(text: string): Promise<unknown>;
}

export interface MermaidCheck {
  kind: "parse" | "unavailable";
  message: string;
}

let loading: Promise<MermaidApi> | null = null;
const cache = new Map<string, MermaidCheck | null>();

async function load(): Promise<MermaidApi> {
  const { Window } = await import("happy-dom");
  const scope = globalThis as Record<string, unknown>;
  const before = new Set(Object.getOwnPropertyNames(scope));
  const previous = scope.window;
  scope.window = new Window();
  try {
    const mermaid = (await import("mermaid")).default as unknown as MermaidApi;
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
    return mermaid;
  } finally {
    for (const name of Object.getOwnPropertyNames(scope)) if (!before.has(name)) delete scope[name];
    if (before.has("window")) scope.window = previous;
  }
}

export async function mermaidError(source: string): Promise<MermaidCheck | null> {
  if (cache.has(source)) return cache.get(source)!;
  let mermaid: MermaidApi;
  try {
    loading ??= load();
    mermaid = await loading;
  } catch (e) {
    loading = null;
    return { kind: "unavailable", message: `the Mermaid parser could not be loaded (${e instanceof Error ? e.message : String(e)}); the diagram is not checked, try again` };
  }
  let error: MermaidCheck | null = null;
  try {
    await mermaid.parse(source);
  } catch (e) {
    error = { kind: "parse", message: (e instanceof Error ? e.message : String(e)).trim().slice(0, 600) };
  }
  cache.set(source, error);
  return error;
}
