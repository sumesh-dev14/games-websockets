import { Router } from "express";
import {
  listCommentaryQuerySchema,
  createCommentarySchema,
} from "../validation/commentary.js";
import { matchIdParamSchema } from "../validation/matches.js";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";

export const commentaryRoutes = Router({ mergeParams: true });

commentaryRoutes.get("/", async (req, res) => {
  const parse = listCommentaryQuerySchema.safeParse(req.query);
  if (!parse.success) {
    return res.status(400).json({
      error: "invalid query parameters",
      details: JSON.stringify(parse.error),
    });
  }

const paramsParsed = matchIdParamSchema.safeParse({
  id: req.params.id
});

  if (!paramsParsed.success) {
    return res.status(400).json({
      error: "invalid match id",
      details: JSON.stringify(paramsParsed.error),
    });
  }

  const limit = Math.min(parse.data.limit ?? 20, 100);
  try {
    const data = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, paramsParsed.data.id))
      .limit(limit)
      .orderBy(desc(commentary.createdAt));

    return res.status(200).json({
      data,
    });
  } catch (error) {
    console.error("Error fetching commentary:", error);
    return res.status(500).json({
      error: "failed to fetch commentary",
    });
  }
});

commentaryRoutes.post("/", async (req, res) => {
const paramsParsed = matchIdParamSchema.safeParse({
  id: req.params.id
});

  if (!paramsParsed.success) {
    return res.status(400).json({
      error: "invalid match id",
      details: JSON.stringify(paramsParsed.error),
    });
  }

  const bodyParsed = createCommentarySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({
      error: "invalid request data",
      details: JSON.stringify(bodyParsed.error),
    });
  }

  try {
    const [event] = await db
      .insert(commentary)
      .values({
        matchId: paramsParsed.data.id,
        ...bodyParsed.data,
        metadata: bodyParsed.data.metadata || {},
        tags: bodyParsed.data.tags ?? null,
      })
      .returning();

    // Broadcast the new commentary event to WebSocket subscribers
    if(res.app.locals.broadcastCommentary){
      res.app.locals.broadcastCommentary(event.matchId, event);
    }
    return res.status(201).json({
      data: event,
    });
  } catch (error) {
    console.error("Error creating commentary:", error);
    return res.status(500).json({
      error: "failed to create commentary",
    });
  }
});
