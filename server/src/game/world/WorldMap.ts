import type { Room } from "shared/types/world";
import { darkForestZone } from "./zones/darkForest";

export class WorldMap {
  private rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map();
    this.loadZones();
  }

  private loadZones(): void {
    this.registerRooms(darkForestZone);
    // future zones get added here, e.g. this.registerRooms(villageZone);
  }

  private registerRooms(rooms: Room[]): void {
    for (const room of rooms) {
      if (this.rooms.has(room.id)) {
        throw new Error(`Duplicate room id: ${room.id}`);
      }
      this.rooms.set(room.id, room);
    }
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  getExitRoom(fromRoomId: string, direction: keyof Room["exits"]): Room | undefined {
    const room = this.getRoom(fromRoomId);
    if (!room) return undefined;

    const exitRoomId = room.exits[direction];
    return exitRoomId ? this.getRoom(exitRoomId) : undefined;
  }
}