import { itemTemplates } from "../items/itemTemplates";

export function getEffectiveAttack(baseAttack: number, equippedWeapon: string | null): number {
  if (!equippedWeapon) return baseAttack;
  return baseAttack + (itemTemplates[equippedWeapon].attackBonus ?? 0);
}

export function getEffectiveDefense(equippedArmor: string | null): number {
  if (!equippedArmor) return 0;
  return itemTemplates[equippedArmor].defenseBonus ?? 0;
}