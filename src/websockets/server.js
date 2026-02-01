import { WebSocketServer, WebSocket } from "ws";
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
  wss.on("connection", (socket, req) => {
    sendJSON(socket, {
      type: "welcome",
      message: "Welcome to the WebSocket server!",
    });

    wss.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  function broadcastMatchCreated(match) {
    broadcastJSON(wss, { type: "match_created", match, data: match });
  }
  return { broadcastMatchCreated };
}
