export type PostResult = { ok: true } | { ok: false; error: string };

/** Same-origin JSON POST to a /api/me route. Never throws; errors are safe, user-facing text. */
export async function postJson(url: string, body: unknown): Promise<PostResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return res.ok ? { ok: true } : { ok: false, error: data.error ?? "Something went wrong." };
  } catch {
    return { ok: false, error: "Network problem. Please try again." };
  }
}
