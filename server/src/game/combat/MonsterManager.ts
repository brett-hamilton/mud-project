import type { MonsterInstance } from "shared/types/monster";
import { monsterTemplates } from "./monsterTemplates";

export class MonsterManager {
  private monsters: Map<string, MonsterInstance> = new Map();

  spawn(templateId: string, roomId: string, instanceId: string): MonsterInstance {
    const template = monsterTemplates[templateId];
    const instance: MonsterInstance = {
      instanceId,
      templateId,
      currentHealth: template.maxHealth,
      roomId
    };
    this.monsters.set(instanceId, instance);
    return instance;
  }

  get(instanceId: string): MonsterInstance | undefined {
    return this.monsters.get(instanceId);
  }

  getInRoom(roomId: string): MonsterInstance[] {
    return [...this.monsters.values()].filter(m => m.roomId === roomId);
  }

  remove(instanceId: string): void {
    this.monsters.delete(instanceId);
  }
}