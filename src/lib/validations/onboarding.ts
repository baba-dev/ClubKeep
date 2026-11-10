import { z } from "zod";

export const createClubInput = z.object({
  name: z.string().trim().min(3).max(100),
}).strict();

export const inviteTokenInput = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
}).strict();

export const idInput = z.string().min(10).max(128).regex(/^[a-zA-Z0-9_-]+$/);
