import type { ItemTemplate } from "shared/types/item";

export const itemTemplates: Record<string, ItemTemplate> = {
  goblin_ear: {
    id: "goblin_ear",
    name: "Goblin Ear",
    description: "A grisly trophy from a defeated goblin."
  },
  troll_tooth: {
    id: "troll_tooth",
    name: "Troll Tooth",
    description: "A massive, yellowed tooth. Could probably be sold."
  },
  rusty_sword: {
    id: "rusty_sword", 
    name: "Rusty Sword", 
    description: "A pitted old blade. Still cuts.",
    equipSlot: "weapon", 
    attackBonus: 3
  },
  leather_armor: {
    id: "leather_armor", 
    name: "Leather Armor", 
    description: "Worn but sturdy hide armor.",
    equipSlot: "armor", 
    defenseBonus: 2
  }
};