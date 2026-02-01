import { Router } from "express";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "../validation/matches.js";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc } from "drizzle-orm";

export const matcheRoutes = Router();

matcheRoutes.get("/", async (req, res) => {
  const parse = listMatchesQuerySchema.safeParse(req.query);
  if (!parse.success) {
    return res.status(400).json({
      error: "invalid query parameters",
      details: JSON.stringify(parse.error),
    });
  }
  const limit = Math.min(parse.data.limit ?? 20, 100);
  try {
    const data = await db
      .select()
      .from(matches)
      .limit(limit)
      .orderBy(desc(matches.createdAt));

    return res.status(200).json({
      data,
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return res.status(500).json({
      error: "failed to fetch matches",
    });
  }
});
matcheRoutes.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid request data",
      details: JSON.stringify(parsed.error),
    });
  }
  try {
    // Assume we have a function to create a match in the database
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
        homeScore: parsed.data.homeScore ?? 0,
        awayScore: parsed.data.awayScore ?? 0,
        status: getMatchStatus(parsed.data.startTime, parsed.data.endTime),
      })
      .returning();

    try {
      if (res.app.locals.broadcastMatchCreated) {
        res.app.locals.broadcastMatchCreated(event);
      }
    } catch (broadcastError) {
      const logger = res.app.locals.logger || console;
      logger.error("Error broadcasting match creation:", broadcastError);
    }

    return res.status(201).json({
      data: event,
    });
  } catch (error) {
    console.error("Error creating match:", error);
    return res.status(500).json({
      error: "failed to create match",
    });
  }
});
