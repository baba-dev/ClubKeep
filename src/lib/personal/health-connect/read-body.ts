import type { NextRequest } from "next/server";
import { OnboardingError } from "@/lib/club-onboarding";

/** Native uploads have a larger limit than the 4KB web mutation guard. */
export async function readNativeBatch(request: NextRequest): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    throw new OnboardingError(415, "Expected JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new OnboardingError(400, "Body required.");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let body = "",
    bytes = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 65536) {
        await reader.cancel();
        throw new OnboardingError(413, "Native upload too large.");
      }
      body += decoder.decode(part.value, { stream: true });
    }
    body += decoder.decode();
    return JSON.parse(body) as unknown;
  } catch (error) {
    if (error instanceof OnboardingError) throw error;
    throw new OnboardingError(400, "Invalid JSON.");
  } finally {
    reader.releaseLock();
  }
}
