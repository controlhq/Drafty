export type CanvasEventType = 'object:added' | 'object:modified' | 'object:removed';

export interface CanvasEvent {
  sessionId: string;
  type: CanvasEventType;
  objectId: string;
  payload: object;
  pageId: string;
}

export interface CursorPosition {
  sessionId: string;
  userId: string;
  x: number;
  y: number;
  pageId: string;
}

export interface SessionInfo {
  id: string;
  createdAt: string;
}

export interface PageInfo {
  id: string;
  name: string;
  objects: Record<string, object>;
}
