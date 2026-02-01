import http from "http";
import express from "express";
import { matcheRoutes } from "./routes/matches.js";
import { attachWebSocketServer } from "./websockets/server.js";
import { securityMiddleware } from "./arcjet.js";

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const app = express();
const server = http.createServer(app);

app.use(express.json()); // Middleware to parse JSON bodies

app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.use(securityMiddleware); // Apply security middleware globally
app.use("/matches", matcheRoutes);

// Attach WebSocket server to the existing HTTP server
const { broadcastMatchCreated } = attachWebSocketServer(server);
// Make the broadcast function available in routes via app locals
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log(`WebSocket running at ws://${HOST}:${PORT}/ws`);
});
