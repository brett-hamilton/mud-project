export interface JoinMessage {
  type: "JOIN";
  playerName: string;
}

export interface CommandMessage {
  type: "COMMAND";
  text: string;
}

export type ClientMessage = JoinMessage | CommandMessage;

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

export interface PlayerSaidMessage {
  type: "PLAYER_SAID";
  playerName: string;
  message: string;
}

export interface ErrorMessage {
  type: "ERROR";
  message: string;
}

export type ServerMessage = 
  | RoomUpdateMessage
  | PlayerEnteredMessage 
  | PlayerLeftMessage 
  | PlayerSaidMessage 
  | ErrorMessage;