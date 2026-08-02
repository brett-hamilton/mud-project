import "dotenv/config";
import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { WorldMap } from "./game/world/WorldMap";
import type { Room } from "shared/types/world";
import { getOrCreatePlayer, updatePlayerRoom, updateEquipment } from "./db/playerRepository";
import { addItemToInventory, getInventory } from "./db/inventoryRepository";
import type { ClientMessage, ServerMessage } from "shared/types/messages";
import { parseCommand } from "shared/parser/commandParser";
import { MonsterManager } from "./game/combat/MonsterManager";
import { resolveAttack } from "./game/combat/CombatSystem";
import { monsterTemplates } from "./game/combat/monsterTemplates";
import { applyXp } from "./game/progression/leveling";
import { updatePlayerProgression } from "./db/playerRepository";
import { rollLoot } from "./game/items/lootRoll";
import { RoomItemManager } from "./game/items/RoomItemManager";
import { itemTemplates } from "./game/items/itemTemplates";
import { getEffectiveAttack, getEffectiveDefense } from "./game/combat/effectiveStats";

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
  equippedWeapon: string | null;
  equippedArmor: string | null;
}

const connectedPlayers = new Map<WebSocket, ConnectedPlayer>();
const monsterManager = new MonsterManager();
const roomItemManager = new RoomItemManager();

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

function roomToPayload(room: Room, monsterNames: string[], items: string[]) {
  return { 
    id: room.id, 
    name: room.name, 
    description: room.description, 
    exits: Object.keys(room.exits),
    monsters: monsterNames,
    items: items
  };
}

function getMonsterNamesInRoom(roomId: string): string[] {
  return monsterManager.getInRoom(roomId).map(m => monsterTemplates[m.templateId].name);
}

function getItemNamesInRoom(roomId: string): string[] {
  return roomItemManager.getItemsInRoom(roomId).map(templateId => itemTemplates[templateId].name);
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
        xp: player.xp,
        equippedWeapon: player.equipped_weapon,
        equippedArmor: player.equipped_armor
      });

      const room = worldMap.getRoom(player.current_room_id)!;
      send(socket, {
        type: "ROOM_UPDATE",
        room: { 
          id: room.id, 
          name: room.name, 
          description: room.description, 
          exits: Object.keys(room.exits), 
          monsters: getMonsterNamesInRoom(room.id), 
          items: getItemNamesInRoom(room.id)
        }
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
              monsters: getMonsterNamesInRoom(oldRoomId), 
              items: getItemNamesInRoom(oldRoomId)
            } });
            return;
          }

          connected.currentRoomId = newRoom.id;
          await updatePlayerRoom(connected.playerId, newRoom.id);

          broadcastToRoom(oldRoomId, { type: "PLAYER_LEFT", playerName: connected.playerName }, socket);
          send(socket, {
            type: "ROOM_UPDATE",
            room: { 
              id: newRoom.id, 
              name: newRoom.name, 
              description: newRoom.description, 
              exits: Object.keys(newRoom.exits), 
              monsters: getMonsterNamesInRoom(newRoom.id), 
              items: getItemNamesInRoom(newRoom.id) }
          });
          broadcastToRoom(newRoom.id, { type: "PLAYER_ENTERED", playerName: connected.playerName }, socket);
          break;
        }

        case "LOOK": {
          const room = worldMap.getRoom(connected.currentRoomId)!;
          send(socket, {
            type: "ROOM_UPDATE",
            room: { 
              id: room.id, 
              name: room.name, 
              description: room.description, 
              exits: Object.keys(room.exits), 
              monsters: getMonsterNamesInRoom(room.id), 
              items: getItemNamesInRoom(room.id)
            }
          });
          break;
        }

        case "SAY": {
          broadcastToRoom(connected.currentRoomId, { type: "PLAYER_SAID", playerName: connected.playerName, message: command.message });
          break;
        }

        case "EQUIP": {
          const inventoryItemIds = await getInventory(connected.playerId);
          const matchId = inventoryItemIds.find(id => itemTemplates[id].name.toLowerCase() === command.target.toLowerCase());

          if (!matchId) {
            send(socket, { type: "ERROR", message: `You don't have a "${command.target}".` });
            break;
          }

          const item = itemTemplates[matchId];
          if (!item.equipSlot) {
            send(socket, { type: "ERROR", message: `You can't equip the ${item.name}.` });
            break;
          }

          if (item.equipSlot === "weapon") connected.equippedWeapon = matchId;
          if (item.equipSlot === "armor") connected.equippedArmor = matchId;

          await updateEquipment(connected.playerId, connected.equippedWeapon, connected.equippedArmor);
          send(socket, { type: "COMBAT_LOG", message: `You equip the ${item.name}.` });
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
          const effectiveAttack = getEffectiveAttack(connected.attackPower, connected.equippedWeapon);
          const result = resolveAttack(effectiveAttack, template.defense, monster.currentHealth);
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

            const droppedItems = rollLoot(template.loot);
            for (const templateId of droppedItems) {
              roomItemManager.addItem(connected.currentRoomId, templateId);
            }

            if (droppedItems.length > 0) {
              const names = droppedItems.map(id => itemTemplates[id].name).join(", ");
              broadcastToRoom(connected.currentRoomId, { type: "COMBAT_LOG", message: `The ${template.name} drops: ${names}` });
            }
            break;
          }

          // monster attacks back
          const playerDefense = getEffectiveDefense(connected.equippedArmor);
          const counter = resolveAttack(template.attackPower, playerDefense, connected.currentHealth);
          connected.currentHealth -= counter.damageDealt;
          send(socket, { type: "COMBAT_LOG", message: `The ${template.name} hits you for ${counter.damageDealt} damage.` });

          if (connected.currentHealth <= 0) {
            connected.currentHealth = connected.maxHealth; // simple respawn: full heal
            connected.currentRoomId = "dark_forest_entrance"; // respawn point
            await updatePlayerRoom(connected.playerId, connected.currentRoomId);
            send(socket, { type: "COMBAT_LOG", message: `You have died and respawned at the entrance.` });
            send(socket, { 
              type: "ROOM_UPDATE", 
              room: roomToPayload(worldMap.getRoom(connected.currentRoomId)!, 
              getMonsterNamesInRoom(connected.currentRoomId), 
              getItemNamesInRoom(connected.currentRoomId)) 
            });
          }
          break;
        }

        case "TAKE": {
          const roomItems = roomItemManager.getItemsInRoom(connected.currentRoomId);
          const matchTemplateId = roomItems.find(id => itemTemplates[id].name.toLowerCase() === command.target.toLowerCase());

          if (!matchTemplateId) {
            send(socket, { type: "ERROR", message: `You don't see a "${command.target}" here.` });
            break;
          }

          roomItemManager.removeOneItem(connected.currentRoomId, matchTemplateId);
          await addItemToInventory(connected.playerId, matchTemplateId);
          send(socket, { type: "COMBAT_LOG", message: `You take the ${itemTemplates[matchTemplateId].name}.` });
          break;
        }

        case "INVENTORY": {
          const items = await getInventory(connected.playerId);
          const names = items.length > 0 ? items.map(id => itemTemplates[id].name).join(", ") : "nothing";
          send(socket, { type: "COMBAT_LOG", message: `You are carrying: ${names}` });
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