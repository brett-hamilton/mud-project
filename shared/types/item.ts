export type EquipSlot = "weapon" | "armor";

export interface ItemTemplate {
  id: string;        
  name: string;
  description: string;
  equipSlot?: EquipSlot;   // absent = not equippable (e.g. goblin_ear stays a trophy)
  attackBonus?: number;    // weapon stat
  defenseBonus?: number;   // armor stat

}

export interface ItemDrop {
  templateId: string;
  chance: number; // 0.0 - 1.0, probability this drops on monster death
}