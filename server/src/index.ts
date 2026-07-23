import "dotenv/config";
import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { WorldMap } from "./game/world/WorldMap";
import { getOrCreatePlayer, updatePlayerRoom } from "./db/playerRepository";
import type { ClientMessage, ServerMessage } from "shared/types/messages";

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const worldMap = new WorldMap();

interface ConnectedPlayer {
  socket: WebSocket;
  playerId: number;
  playerName: string;
  currentRoomId: string;
}

const connectedPlayers = new Map<WebSocket, ConnectedPlayer>();

function send(socket: WebSocket, message: ServerMessage) {
  socket.send(JSON.stringify(message));
}

function broadcastToRoom(roomId: string, message: ServerMessage, excludeSocket?: WebSocket) {
  for (const player of connectedPlayers.values()) {
    if (player.currentRoomId === roomId && player.socket !== excludeSocket) {
      send(player.socket, message);
    }
  }
}

wss.on("connection", (socket) => {
  socket.on("message", async (data) => {
    const message: ClientMessage = JSON.parse(data.toString());

    if (message.type === "JOIN") {
      const player = await getOrCreatePlayer(message.playerName);
      connectedPlayers.set(socket, {
        socket,
        playerId: player.id,
        playerName: player.name,
        currentRoomId: player.current_room_id
      });

      const room = worldMap.getRoom(player.current_room_id)!;
      send(socket, {
        type: "ROOM_UPDATE",
        room: { id: room.id, name: room.name, description: room.description, exits: Object.keys(room.exits) }
      });

      broadcastToRoom(room.id, { type: "PLAYER_ENTERED", playerName: player.name }, socket);
    }

    if (message.type === "MOVE") {
      const connected = connectedPlayers.get(socket);
      if (!connected) return; // hasn't joined yet

      const oldRoomId = connected.currentRoomId;
      const newRoom = worldMap.getExitRoom(oldRoomId, message.direction);

      if (!newRoom) {
        send(socket, { type: "ROOM_UPDATE", room: { id: oldRoomId, name: "", description: "There is no exit that way.", exits: [] } });
        return;
      }

      connected.currentRoomId = newRoom.id;
      await updatePlayerRoom(connected.playerId, newRoom.id);

      broadcastToRoom(oldRoomId, { type: "PLAYER_LEFT", playerName: connected.playerName }, socket);

      send(socket, {
        type: "ROOM_UPDATE",
        room: { id: newRoom.id, name: newRoom.name, description: newRoom.description, exits: Object.keys(newRoom.exits) }
      });

      broadcastToRoom(newRoom.id, { type: "PLAYER_ENTERED", playerName: connected.playerName }, socket);
    }
  });

  socket.on("close", () => {
    const connected = connectedPlayers.get(socket);
    if (connected) {
      broadcastToRoom(connected.currentRoomId, { type: "PLAYER_LEFT", playerName: connected.playerName }, socket);
      connectedPlayers.delete(socket);
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});