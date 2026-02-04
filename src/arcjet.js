import arcjet, { shield, slidingWindow, detectBot } from "@arcjet/node";

/*
 * Arcjet Security Configuration (Optional)
 */
const arcjetKey = process.env.ARCJET_API_KEY;
const arcjetEnv = process.env.ARCJET_ENV || "development";
const arcjetMode = arcjetEnv === "production" ? "LIVE" : "DRY_RUN";

if (arcjetEnv !== "production") {
  console.log("Arcjet running in DRY_RUN mode");
}

const baseRules = [
  shield({ mode: arcjetMode }),

  // Enable bot detection only in production
  ...(arcjetEnv === "production"
    ? [
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
      ]
    : []),
];

export const httpArcjet = arcjetKey
  ? arcjet({
      apiKey: arcjetKey,
      env: arcjetEnv,
      rules: [
        ...baseRules,
        ...(arcjetEnv === "production"
          ? [
              slidingWindow({
                mode: arcjetMode,
                interval: 10 * 1000,
                max: 50,
              }),
            ]
          : []),
      ],
    })
  : null;

export const webSocketArcjet =
  arcjetKey && arcjetEnv === "production"
    ? arcjet({
        apiKey: arcjetKey,
        env: arcjetEnv,
        rules: [
          ...baseRules,
          slidingWindow({
            mode: arcjetMode,
            interval: 2 * 1000,
            max: 10,
          }),
        ],
      })
    : null;


// Express middleware wrapper
export const securityMiddleware = async (req, res, next) => {
  if (!httpArcjet) return next();
  try {
    const decision = await httpArcjet.protect(req);

    // decision is denied
    if (decision.isDenied) {
      // In development/DRY_RUN, let requests through and only log the decision.
      if (arcjetEnv !== "production") {
        console.warn("Arcjet DRY_RUN denied request:", decision.reason);
        return next();
      }
      if (decision.reason?.isRateLimit) {
        return res.status(429).json({ error: "Too many requests" });
      }
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  } catch (error) {
    console.error("Arcjet middleware error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
