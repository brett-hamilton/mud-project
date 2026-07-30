// server/src/game/progression/leveling.ts

// XP required to reach the *next* level from the current one
export function xpToNextLevel(currentLevel: number): number {
  return currentLevel * 50; // level 1→2 needs 50xp, 2→3 needs 100xp, etc.
}

export interface LevelUpResult {
  newLevel: number;
  newXp: number;
  leveledUp: boolean;
  newMaxHealth: number;
  newAttackPower: number;
}

export function applyXp(currentLevel: number, currentXp: number, xpGained: number, currentMaxHealth: number, currentAttackPower: number): LevelUpResult {
  let level = currentLevel;
  let xp = currentXp + xpGained;
  let maxHealth = currentMaxHealth;
  let attackPower = currentAttackPower;
  let leveledUp = false;

  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
    maxHealth += 5;
    attackPower += 2;
    leveledUp = true;
  }

  return { newLevel: level, newXp: xp, leveledUp, newMaxHealth: maxHealth, newAttackPower: attackPower };
}