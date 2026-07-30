import "dotenv/config";
import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { WorldMap } from "./game/world/WorldMap";
import type { Room } from "shared/types/world";
import { getOrCreatePlayer, updatePlayerRoom } from "./db/playerRepository";
import type { ClientMessage, ServerMessage } from "shared/types/messages";
import { parseCommand } from "shared/parser/commandParser";
import { MonsterManager } from "./game/combat/MonsterManager";
import { resolveAttack } from "./game/combat/CombatSystem";
import { monsterTemplates } from "./game/combat/monsterTemplates";
import { applyXp } from "./game/progression/leveling";
import { updatePlayerProgression } from "./db/playerRepository";

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
  currentHealth: number;
  maxHealth: number;
  attackPower: number;
  level: number;
  xp: number;
}

const connectedPlayers = new Map<WebSocket, ConnectedPlayer>();
const monsterManager = new MonsterManager();

// Hardcoded monster spawns for testing
monsterManager.spawn("goblin", "dark_forest_path", "goblin_1");
monsterManager.spawn("troll", "dark_forest_clearing", "troll_1");


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

function roomToPayload(room: Room, monsterNames: string[]) {
  return { 
    id: room.id, 
    name: room.name, 
    description: room.description, 
    exits: Object.keys(room.exits) ,
    monsters: monsterNames
  };
}

function getMonsterNamesInRoom(roomId: string): string[] {
  return monsterManager.getInRoom(roomId).map(m => monsterTemplates[m.templateId].name);
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
        currentRoomId: player.current_room_id,
        currentHealth: player.current_health,
        maxHealth: player.max_health,
        attackPower: player.attack_power,
        level: player.level,
        xp: player.xp
      });

      const room = worldMap.getRoom(player.current_room_id)!;
      send(socket, {
        type: "ROOM_UPDATE",
        room: { id: room.id, name: room.name, description: room.description, exits: Object.keys(room.exits), monsters: getMonsterNamesInRoom(room.id) }
      });

      broadcastToRoom(room.id, { type: "PLAYER_ENTERED", playerName: player.name }, socket);
    }

    if (message.type === "COMMAND") {
      const connected = connectedPlayers.get(socket);
      if (!connected) return;

      const command = parseCommand(message.text);

      switch (command.type) {
        case "MOVE": {
          const oldRoomId = connected.currentRoomId;
          const newRoom = worldMap.getExitRoom(oldRoomId, command.direction);

          if (!newRoom) {
            send(socket, { type: "ROOM_UPDATE", room: {
              id: oldRoomId, name: "", description: "There is no exit that way.", exits: [],
              monsters: getMonsterNamesInRoom(oldRoomId)
            } });
            return;
          }

          connected.currentRoomId = newRoom.id;
          await updatePlayerRoom(connected.playerId, newRoom.id);

          broadcastToRoom(oldRoomId, { type: "PLAYER_LEFT", playerName: connected.playerName }, socket);
          send(socket, {
            type: "ROOM_UPDATE",
            room: { id: newRoom.id, name: newRoom.name, description: newRoom.description, exits: Object.keys(newRoom.exits), monsters: getMonsterNamesInRoom(newRoom.id) }
          });
          broadcastToRoom(newRoom.id, { type: "PLAYER_ENTERED", playerName: connected.playerName }, socket);
          break;
        }

        case "LOOK": {
          const room = worldMap.getRoom(connected.currentRoomId)!;
          send(socket, {
            type: "ROOM_UPDATE",
            room: { id: room.id, name: room.name, description: room.description, exits: Object.keys(room.exits), monsters: getMonsterNamesInRoom(room.id) }
          });
          break;
        }

        case "SAY": {
          broadcastToRoom(connected.currentRoomId, { type: "PLAYER_SAID", playerName: connected.playerName, message: command.message });
          break;
        }

        case "ATTACK": {
          const monster = monsterManager.getInRoom(connected.currentRoomId)
            .find(m => monsterTemplates[m.templateId].name.toLowerCase() === command.target.toLowerCase());

          if (!monster) {
            send(socket, { type: "ERROR", message: `You don't see a "${command.target}" here.` });
            break;
          }

          const template = monsterTemplates[monster.templateId];
          const result = resolveAttack(connected.attackPower, template.defense, monster.currentHealth);
          monster.currentHealth -= result.damageDealt;

          send(socket, { type: "COMBAT_LOG", message: `You hit the ${template.name} for ${result.damageDealt} damage.` });
          broadcastToRoom(connected.currentRoomId, { type: "COMBAT_LOG", message: `${connected.playerName} attacks the ${template.name}.` }, socket);

          if (result.targetDied) {
            monsterManager.remove(monster.instanceId);
            send(socket, { type: "COMBAT_LOG", message: `You defeated the ${template.name}!` });
            broadcastToRoom(connected.currentRoomId, { type: "COMBAT_LOG", message: `${connected.playerName} defeats the ${template.name}!` }, socket);
            
            const progression = applyXp(connected.level, connected.xp, template.xpReward, connected.maxHealth, connected.attackPower);
            connected.level = progression.newLevel;
            connected.xp = progression.newXp;
            connected.maxHealth = progression.newMaxHealth;
            connected.attackPower = progression.newAttackPower;

            await updatePlayerProgression(connected.playerId, connected.level, connected.xp, connected.maxHealth, connected.attackPower);

            send(socket, { type: "COMBAT_LOG", message: `You gain ${template.xpReward} XP.` });

            if (progression.leveledUp) {
              connected.currentHealth = connected.maxHealth; // full heal on level up, classic RPG feel
              send(socket, { type: "COMBAT_LOG", message: `You leveled up! You are now level ${connected.level}.` });
            }
            break;
          }

          // monster attacks back
          const counter = resolveAttack(template.attackPower, 0, connected.currentHealth);
          connected.currentHealth -= counter.damageDealt;
          send(socket, { type: "COMBAT_LOG", message: `The ${template.name} hits you for ${counter.damageDealt} damage.` });

          if (connected.currentHealth <= 0) {
            connected.currentHealth = connected.maxHealth; // simple respawn: full heal
            connected.currentRoomId = "dark_forest_entrance"; // respawn point
            await updatePlayerRoom(connected.playerId, connected.currentRoomId);
            send(socket, { type: "COMBAT_LOG", message: `You have died and respawned at the entrance.` });
            send(socket, { type: "ROOM_UPDATE", room: roomToPayload(worldMap.getRoom(connected.currentRoomId)!, getMonsterNamesInRoom(connected.currentRoomId)) });
          }
          break;
        }

        case "UNKNOWN": {
          send(socket, { type: "ERROR", message: `Unknown command: "${command.raw}"` });
          break;
        }
      }
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