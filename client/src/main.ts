import type { ClientMessage, ServerMessage } from "shared/types/messages";

const output = document.getElementById("output")!;
const form = document.getElementById("command-form") as HTMLFormElement;
const input = document.getElementById("command-input") as HTMLInputElement;

function log(text: string, className = "") {
  const line = document.createElement("div");
  if (className) line.className = className;
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

const playerName = prompt("Enter your character name:") ?? "adventurer";

const socket = new WebSocket("ws://localhost:3000");

socket.addEventListener("open", () => {
  log("Connected to server.", "system");
  send({ type: "JOIN", playerName });
});

socket.addEventListener("message", (event) => {
  const message: ServerMessage = JSON.parse(event.data);
  handleServerMessage(message);
});

socket.addEventListener("close", () => {
  log("Disconnected from server.", "error");
});

function send(message: ClientMessage) {
  socket.send(JSON.stringify(message));
}

// client/src/main.ts — extend handleServerMessage
function handleServerMessage(message: ServerMessage) {
  switch (message.type) {
    case "ROOM_UPDATE":
      log(message.room.name, "room-name");
      log(message.room.description);
      if (message.room.monsters.length > 0) log(`You see: ${message.room.monsters.join(", ")}`, "monster");
      if (message.room.exits.length > 0) log(`Exits: ${message.room.exits.join(", ")}`, "system");
      break;
    case "PLAYER_ENTERED":
      log(`${message.playerName} arrives.`, "player-event");
      break;
    case "PLAYER_LEFT":
      log(`${message.playerName} leaves.`, "player-event");
      break;
    case "PLAYER_SAID":
      log(`${message.playerName} says: "${message.message}"`, "player-event");
      break;
    case "COMBAT_LOG":
      log(message.message, "combat");
      break;
    case "ERROR":
      log(message.message, "error");
      break;
  }
}

const directions = ["north", "south", "east", "west", "up", "down"];

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  input.value = "";
  if (!text) return;

  log(`> ${text}`, "system");
  send({ type: "COMMAND", text });
});