import { pool } from "./pool";

export async function addItemToInventory(playerId: number, templateId: string) {
  await pool.query(
    "INSERT INTO inventory_items (player_id, template_id) VALUES ($1, $2)",
    [playerId, templateId]
  );
}

export async function getInventory(playerId: number): Promise<string[]> {
  const result = await pool.query(
    "SELECT template_id FROM inventory_items WHERE player_id = $1",
    [playerId]
  );
  return result.rows.map(row => row.template_id);
}