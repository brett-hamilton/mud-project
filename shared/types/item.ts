export interface ItemTemplate {
  id: string;        
  name: string;
  description: string;
}

export interface ItemDrop {
  templateId: string;
  chance: number; // 0.0 - 1.0, probability this drops on monster death
}