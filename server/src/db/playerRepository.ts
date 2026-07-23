// server/src/db/playerRepository.ts
import { pool } from "./pool";

export async function getOrCreatePlayer(name: string) {
  const existing = await pool.query(
    "SELECT * FROM players WHERE name = $1",
    [name]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const created = await pool.query(
    "INSERT INTO players (name) VALUES ($1) RETURNING *",
    [name]
  );

  return created.rows[0];
}

export async function updatePlayerRoom(playerId: number, roomId: string) {
  await pool.query(
    "UPDATE players SET current_room_id = $1 WHERE id = $2",
    [roomId, playerId]
  );
}