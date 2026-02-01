import http from "http";
import express from "express";
import { matcheRoutes } from "./routes/matches.js";
import { attachWebSocketServer } from "./websockets/server.js";

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const app = express();
const server = http.createServer(app);

app.use(express.json()); // Middleware to parse JSON bodies

app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.use("/matches", matcheRoutes);

// Attach WebSocket server to the existing HTTP server
const { broadcastMatchCreated } = attachWebSocketServer(server);
// Make the broadcast function available in routes via app locals
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`WebSocket running at ws://localhost:${PORT}/ws`);
});
