// server/src/wsTestClient.ts
import WebSocket from "ws";

const playerName = process.argv[2] ?? "testplayer";
const socket = new WebSocket("ws://localhost:3000");

socket.on("open", () => {
  socket.send(JSON.stringify({ type: "JOIN", playerName }));
});

socket.on("message", (data) => {
  console.log(`[${playerName}] received:`, data.toString());
});