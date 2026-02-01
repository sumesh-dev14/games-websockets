import arcjet, { shield, slidingWindow, detectBot } from "@arcjet/node";
const arcjetKey = process.env.ARCJET_API_KEY;
const arcjetEnv = process.env.ARCJET_ENV;
const arcjetMode = arcjetEnv === "production" ? "LIVE" : "DRY_RUN";

if (!arcjetKey) {
  throw new Error("ARCJET_API_KEY is not set in .env file");
}

if (!arcjetEnv) {
  throw new Error("ARCJET_ENV is not set in .env file");
}
export const httpArcjet = arcjetKey
  ? arcjet({
      apiKey: arcjetKey,
      env: arcjetEnv,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({ mode: arcjetMode, interval: 10 * 1000, max: 50 }), // 50 requests per 10 seconds
      ],
    })
  : null;

export const webSocketArcjet = arcjetKey
  ? arcjet({
      apiKey: arcjetKey,
      env: arcjetEnv,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({ mode: arcjetMode, interval: 2 * 1000, max: 5 }), // 5 requests per 2 seconds
      ],
    })
  : null;

export const securityMiddleware = async (req, res, next) => {
  if (!httpArcjet) return next();
  try {
    const decision = await httpArcjet.protect(req);

    // desicion is denied
    if (decision.isDenied) {
      if (decision.reason.isRateLimit) {
        return res.status(429).json({ error: "Too many requests" });
      }
      return res.status(403).json({ error: "Access denied" });
    }
  } catch (error) {
    console.error("Error in Arcjet middleware:", error);
    return res.status(500).json({ error: "Internal server error" });
  }

  next();
};
