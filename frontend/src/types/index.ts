export type CanvasEventType = 'object:added' | 'object:modified' | 'object:removed';

export interface CanvasEvent {
  sessionId: string;
  type: CanvasEventType;
  objectId: string;
  payload: object;
}

export interface CursorPosition {
  sessionId: string;
  userId: string;
  x: number;
  y: number;
}

export interface SessionInfo {
  id: string;
  createdAt: string;
}
