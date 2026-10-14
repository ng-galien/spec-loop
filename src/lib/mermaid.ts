interface MermaidApi {
  initialize(config: Record<string, unknown>): void;
  parse(text: string): Promise<unknown>;
}

let loading: Promise<MermaidApi> | null = null;
const cache = new Map<string, string | null>();

async function load(): Promise<MermaidApi> {
  const { Window } = await import("happy-dom");
  const scope = globalThis as { window?: unknown };
  const had = "window" in scope;
  const previous = scope.window;
  scope.window = new Window();
  try {
    const mermaid = (await import("mermaid")).default as unknown as MermaidApi;
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
    return mermaid;
  } finally {
    if (had) scope.window = previous;
    else delete scope.window;
  }
}

export async function mermaidError(source: string): Promise<string | null> {
  if (cache.has(source)) return cache.get(source)!;
  loading ??= load();
  const mermaid = await loading;
  let error: string | null = null;
  try {
    await mermaid.parse(source);
  } catch (e) {
    error = (e instanceof Error ? e.message : String(e)).trim().slice(0, 600);
  }
  cache.set(source, error);
  return error;
}
