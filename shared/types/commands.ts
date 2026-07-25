export type Direction = "north" | "south" | "east" | "west" | "up" | "down";

export interface MoveCommand {
  type: "MOVE";
  direction: Direction;
}

export interface LookCommand {
  type: "LOOK";
}

export interface SayCommand {
  type: "SAY";
  message: string;
}

export interface UnknownCommand {
  type: "UNKNOWN";
  raw: string;
}

export type ParsedCommand = MoveCommand | LookCommand | SayCommand | UnknownCommand;