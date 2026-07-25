import type { ParsedCommand, Direction } from "../types/commands";

const DIRECTIONS: Record<string, Direction> = {
  north: "north", n: "north",
  south: "south", s: "south",
  east: "east", e: "east",
  west: "west", w: "west",
  up: "up", u: "up",
  down: "down", d: "down",
};

export function parseCommand(raw: string): ParsedCommand {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return { type: "UNKNOWN", raw };

  const [verb, ...rest] = trimmed.split(/\s+/);
  const argument = rest.join(" ");

  if (verb in DIRECTIONS) {
    return { type: "MOVE", direction: DIRECTIONS[verb] };
  }

  switch (verb) {
    case "look":
    case "l":
      return { type: "LOOK" };

    case "say":
      return { type: "SAY", message: argument };

    default:
      return { type: "UNKNOWN", raw };
  }
}