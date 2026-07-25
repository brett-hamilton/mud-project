export interface MonsterTemplate {
  id: string;           // template id, e.g. "goblin"
  name: string;
  maxHealth: number;
  attackPower: number;
  defense: number;
  xpReward: number;
}

export interface MonsterInstance {
  instanceId: string;    // unique per spawned monster, e.g. "goblin_1"
  templateId: string;    // references MonsterTemplate
  currentHealth: number;
  roomId: string;
}