export interface JoinMessage {
  type: "JOIN";
  playerName: string;
}

export interface MoveMessage {
  type: "MOVE";
  direction: "north" | "south" | "east" | "west" | "up" | "down";
}

export type ClientMessage = JoinMessage | MoveMessage;

export interface RoomUpdateMessage {
  type: "ROOM_UPDATE";
  room: {
    id: string;
    name: string;
    description: string;
    exits: string[];
  };
}

export interface PlayerEnteredMessage {
  type: "PLAYER_ENTERED";
  playerName: string;
}

export interface PlayerLeftMessage {
  type: "PLAYER_LEFT";
  playerName: string;
}

export type ServerMessage = RoomUpdateMessage | PlayerEnteredMessage | PlayerLeftMessage;