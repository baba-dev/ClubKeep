import { z } from "zod";

export const checkoutInput = z.object({ tier: z.enum(["STARTER", "GROWTH", "PRO"]) }).strict();
