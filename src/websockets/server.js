import { WebSocketServer, WebSocket } from "ws";
import { webSocketArcjet } from "../arcjet.js";
// Utility (helper) function to send JSON data over a WebSocket connection
function sendJSON(ws, data) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(data));
}

// send data to all connected clients
function broadcastJSON(wss, data) {
  if (!wss) return;
  for (const client of wss.clients) {
    sendJSON(client, data);
  }
}

// Function to attach a WebSocket server to an existing HTTP server
// this function will receive the HTTP server instance created by express
// and pass it to the WebSocket server so that it can handle WebSocket connections
export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 10 * 1024 * 1024, // 10 MB
  });

  wss.on("error", (error) => {
    console.error("WebSocket server error:", error);
  });

  wss.on("connection", async (socket, req) => {
    if (webSocketArcjet) {
      try {
        const decision = await webSocketArcjet.protect(req);
        if (decision.isDenied) {
          const code = decision.reason.isRateLimit ? 1013 : 1008; // 1013: Try Again Later, 1008: Policy Violation
          const reason = decision.reason.isRateLimit
            ? "Rate limit exceeded"
            : "Access denied";
          socket.close(code, reason);
          return;
        }
      } catch (error) {
        console.error("WebSocket Arcjet error:", error);
        socket.close(1011, "Internal server error"); // 1011: Internal Error
        return;
      }
    }
    sendJSON(socket, {
      type: "welcome",
      message: "Welcome to the WebSocket server!",
    });

    socket.on("error", (error) => {
      console.error("WebSocket socket error:", error);
    });
  });

  function broadcastMatchCreated(match) {
    broadcastJSON(wss, { type: "match_created", match, data: match });
  }
  return { broadcastMatchCreated };
}
