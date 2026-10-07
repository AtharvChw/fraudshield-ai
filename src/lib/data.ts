export async function loadJson<T>(path: string, fallback: T): Promise<{ data: T; isFallback: boolean }> {
  try {
    const r = await fetch(path);
    if (!r.ok) return { data: fallback, isFallback: true };
    return { data: (await r.json()) as T, isFallback: false };
  } catch {
    return { data: fallback, isFallback: true };
  }
}
