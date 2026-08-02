import type { ItemDrop } from "shared/types/item";

export function rollLoot(dropTable: ItemDrop[]): string[] {
  const dropped: string[] = [];
  for (const drop of dropTable) {
    if (Math.random() < drop.chance) {
      dropped.push(drop.templateId);
    }
  }
  return dropped;
}