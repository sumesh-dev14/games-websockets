import { WebSocketServer, WebSocket } from "ws";
import { webSocketArcjet } from "../arcjet.js";


const matchSubscriptionClients = new Map(); // Map to hold clients subscribed to match updates

function subscribe(matchId, socket) {
  // Add the socket to the set of subscribers for the given matchId
  if (!matchSubscriptionClients.has(matchId)) {
    matchSubscriptionClients.set(matchId, new Set());
  }
  matchSubscriptionClients.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
  const subscribers = matchSubscriptionClients.get(matchId);
  if (!subscribers) return;
  subscribers.delete(socket);
  if (subscribers.size == 0) {
    matchSubscriptionClients.delete(matchId);
  }
}

function cleanupSubscriptions(socket) {
  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}



// Utility (helper) function to send JSON data over a WebSocket connection
function sendJSON(ws, data) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(data));
}

// send data to all connected clients
function broadcastToAll(wss, data) {
  if (!wss) return;
  for (const client of wss.clients) {
    sendJSON(client, data);
  }
}

// sen data only to clients subscribed to a specific match
function broadcastToMatchSubscribers(matchId, data) {
  const subscribers = matchSubscriptionClients.get(matchId);
  if (!subscribers || subscribers.size == 0) return;

  const message = JSON.stringify(data);
  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}



// handling errors 

function handleMessage(socket, data){
  let message;
  try {
    message = JSON.parse(data.toString());
  } catch (error) {
    sendJSON(socket, {type: "error", message: "Invalid JSON format"});
    return;
  }
  if (message?.type === "subscribe" && Number.isInteger(message.matchId)){
    subscribe(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJSON(socket, {type: "subscribed", matchId: message.matchId});
    return;
  }
  if (message?.type === "unsubscribe" && Number.isInteger(message.matchId)){
    unsubscribe(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJSON(socket, {type: "unsubscribed", matchId: message.matchId});
    return;
  }
}

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
    socket.subscriptions = new Set();

    sendJSON(socket, {
      type: "welcome",
      message: "Welcome to the WebSocket server!",
    });

    socket.on("message", (data)=>{
      handleMessage(socket, data);
    });
    socket.on("close", ()=>{
      cleanupSubscriptions(socket);
    });

    socket.on("error", (error) => {
      console.error("WebSocket socket error:", error);
      socket.terminate();
    });
  });

  function broadcastMatchCreated(match) {
    broadcastToAll(wss, { type: "match_created", match, data: match });
  }
  function broadcastCommentary(matchId, updates){
    broadcastToMatchSubscribers(matchId, {type: "commentary_update", matchId, updates});

  }
  return { broadcastMatchCreated, broadcastCommentary };
}
