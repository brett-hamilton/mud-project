export interface Exits {
  north?: string;
  south?: string;
  east?: string;
  west?: string;
  up?: string;
  down?: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  exits: Exits;
  entities: string[];
  items: string[];
  zone: string;
}