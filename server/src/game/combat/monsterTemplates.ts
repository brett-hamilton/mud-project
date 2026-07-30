import type { MonsterTemplate } from "shared/types/monster";

export const monsterTemplates: Record<string, MonsterTemplate> = {
  goblin: {
    id: "goblin",
    name: "Goblin",
    maxHealth: 20,
    attackPower: 4,
    defense: 1,
    xpReward: 10
  },
  troll: {
    id: "troll",
    name: "Troll",
    maxHealth: 40,
    attackPower: 8,
    defense: 3,
    xpReward: 25
  }
};