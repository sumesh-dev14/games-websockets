import { z } from "zod";

export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const createCommentarySchema = z.object({
  minute: z.coerce.number().int().nonnegative(),
  sequence: z.coerce.number().int().nonnegative(),
  period: z.string().trim().min(1, "Period must be a non-empty string"),
  eventType: z.string().trim().min(1, "Event type must be a non-empty string"),
  actor: z.string().trim().min(1, "Actor must be a non-empty string"),
  team: z.string().trim().min(1, "Team must be a non-empty string"),
  message: z.string().trim().min(1, "Message must be a non-empty string"),
  metadata: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});
