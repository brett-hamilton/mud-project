export class RoomItemManager {
  private itemsByRoom: Map<string, string[]> = new Map(); // roomId -> templateIds

  addItem(roomId: string, templateId: string): void {
    const existing = this.itemsByRoom.get(roomId) ?? [];
    existing.push(templateId);
    this.itemsByRoom.set(roomId, existing);
  }

  getItemsInRoom(roomId: string): string[] {
    return this.itemsByRoom.get(roomId) ?? [];
  }

  removeOneItem(roomId: string, templateId: string): boolean {
    const items = this.itemsByRoom.get(roomId) ?? [];
    const index = items.indexOf(templateId);
    if (index === -1) return false;
    items.splice(index, 1);
    this.itemsByRoom.set(roomId, items);
    return true;
  }
}