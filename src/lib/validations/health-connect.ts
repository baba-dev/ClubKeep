import { z } from "zod";
export const healthPairClaimInput = z
  .object({
    pairCode: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    installationId: z.uuid(),
    label: z.string().trim().min(2).max(80),
  })
  .strict();
export const healthConnectionIdInput = z.object({ id: z.string().min(10).max(128) }).strict();
export const healthPurgeInput = z.object({ confirm: z.literal(true) }).strict();
