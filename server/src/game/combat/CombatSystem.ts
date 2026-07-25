export interface CombatResult {
  damageDealt: number;
  targetDied: boolean;
}

export function resolveAttack(attackPower: number, defenderDefense: number, defenderCurrentHealth: number): CombatResult {
  const rawDamage = Math.max(1, attackPower - defenderDefense); // minimum 1 damage so fights always progress
  const variance = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
  const damageDealt = Math.max(1, rawDamage + variance);

  const remainingHealth = defenderCurrentHealth - damageDealt;
  return { damageDealt, targetDied: remainingHealth <= 0 };
}