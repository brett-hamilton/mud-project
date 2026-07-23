import type { Room } from "shared/types/world";

export const darkForestZone: Room[] = [
  {
    id: "dark_forest_entrance",
    name: "Edge of the Dark Forest",
    description: "Gnarled trees loom overhead. A worn path leads north into darkness.",
    exits: { north: "dark_forest_path" },
    entities: [],
    items: [],
    zone: "dark_forest"
  },
  {
    id: "dark_forest_path",
    name: "Dark Forest Path",
    description: "The canopy blocks out most light. Paths lead north and south.",
    exits: { north: "dark_forest_clearing", south: "dark_forest_entrance" },
    entities: [],
    items: [],
    zone: "dark_forest"
  },
  {
    id: "dark_forest_clearing",
    name: "Forest Clearing",
    description: "Sunlight breaks through here. A path leads south back into the trees.",
    exits: { south: "dark_forest_path" },
    entities: [],
    items: [],
    zone: "dark_forest"
  }
];