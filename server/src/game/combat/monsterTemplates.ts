import type { MonsterTemplate } from "shared/types/monster";
import type { ItemDrop } from "shared/types/item";

interface MonsterTemplateWithLoot extends MonsterTemplate {
  loot: ItemDrop[];
}

export const monsterTemplates: Record<string, MonsterTemplateWithLoot> = {
  goblin: {
    id: "goblin", name: "Goblin", maxHealth: 20, attackPower: 4, defense: 1, xpReward: 10,
    loot: [
      { templateId: "goblin_ear", chance: 0.6 },
      { templateId: "rusty_sword", chance: 0.9 },
      { templateId: "leather_armor", chance: 0.9 }
    ]
  },
  troll: {
    id: "troll", name: "Troll", maxHealth: 40, attackPower: 8, defense: 3, xpReward: 25,
    loot: [{ templateId: "troll_tooth", chance: 0.9 }]
  }
};