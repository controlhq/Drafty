import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export interface UserInfo {
    socketId: string;
    username: string;
    cursorColor: string;
}

export interface RemoteCursor {
    socketId: string;
    username: string;
    cursorColor: string;
    x: number;
    y: number;
    pageId: string;
}

export interface SessionJoinedPayload {
    user: UserInfo;
    users: UserInfo[];
    canvasObjects: Record<string, object>;
}

interface UseSocketOptions {
    sessionId: string;
    username: string;
    onSessionJoined: (payload: SessionJoinedPayload) => void;
    onObjectAdded: (pageId: string, objectId: string, fabricObject: object) => void;
    onObjectModified: (pageId: string, objectId: string, fabricObject: object) => void;
    onObjectRemoved: (pageId: string, objectId: string) => void;
    onCanvasClear: (pageId: string) => void;
    onCursorMove: (cursor: RemoteCursor) => void;
    onUserJoined: (user: UserInfo) => void;
    onUserLeft: (socketId: string, username: string) => void;
    onLatencyUpdate?: (ms: number) => void;
    onE2ELatencyUpdate?: (ms: number) => void;
}

export function useSocket(options: UseSocketOptions) {
    const socketRef = useRef<Socket | null>(null);
    const optionsRef = useRef(options);
    optionsRef.current = options;
    const clockOffsetRef = useRef<number>(0);

    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ['websocket'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join-session', {
                sessionId: options.sessionId,
                username: options.username,
            });
        });

        const pingInterval = setInterval(() => {
            socket.emit('ping-latency', Date.now());
        }, 3000);

        socket.on('pong-latency', ({ clientTs, serverTs }: { clientTs: number; serverTs: number }) => {
            const now = Date.now();
            const rtt = now - clientTs;
            clockOffsetRef.current = serverTs - (clientTs + rtt / 2);
            optionsRef.current.onLatencyUpdate?.(rtt);
        });

        socket.on('session-joined', (payload: SessionJoinedPayload) => {
            optionsRef.current.onSessionJoined(payload);
        });

        socket.on('canvas:object-added', ({ pageId, objectId, fabricObject, serverTs }: { pageId: string; objectId: string; fabricObject: object; serverTs?: number }) => {
            if (serverTs !== undefined) {
                const e2e = Date.now() - clockOffsetRef.current - serverTs;
                optionsRef.current.onE2ELatencyUpdate?.(Math.max(0, e2e));
            }
            optionsRef.current.onObjectAdded(pageId, objectId, fabricObject);
        });

        socket.on('canvas:object-modified', ({ pageId, objectId, fabricObject, serverTs }: { pageId: string; objectId: string; fabricObject: object; serverTs?: number }) => {
            if (serverTs !== undefined) {
                const e2e = Date.now() - clockOffsetRef.current - serverTs;
                optionsRef.current.onE2ELatencyUpdate?.(Math.max(0, e2e));
            }
            optionsRef.current.onObjectModified(pageId, objectId, fabricObject);
        });

        socket.on('canvas:object-removed', ({ pageId, objectId }: { pageId: string; objectId: string }) => {
            optionsRef.current.onObjectRemoved(pageId, objectId);
        });

        socket.on('canvas:clear', ({ pageId }: { pageId: string }) => {
            optionsRef.current.onCanvasClear(pageId);
        });

        socket.on('cursor:move', (cursor: RemoteCursor) => {
            optionsRef.current.onCursorMove(cursor);
        });

        socket.on('user-joined', (user: UserInfo) => {
            optionsRef.current.onUserJoined(user);
        });

        socket.on('user-left', ({ socketId, username }: { socketId: string; username: string }) => {
            optionsRef.current.onUserLeft(socketId, username);
        });

        return () => {
            clearInterval(pingInterval);
            socket.disconnect();
        };
    }, [options.sessionId, options.username]);

    const emitObjectAdded = useCallback((pageId: string, objectId: string, fabricObject: object) => {
        socketRef.current?.emit('canvas:object-added', { pageId, objectId, fabricObject });
    }, []);

    const emitObjectModified = useCallback((pageId: string, objectId: string, fabricObject: object) => {
        socketRef.current?.emit('canvas:object-modified', { pageId, objectId, fabricObject });
    }, []);

    const emitObjectRemoved = useCallback((pageId: string, objectId: string) => {
        socketRef.current?.emit('canvas:object-removed', { pageId, objectId });
    }, []);

    const emitClear = useCallback((pageId: string) => {
        socketRef.current?.emit('canvas:clear', { pageId });
    }, []);

    const emitCursorMove = useCallback((pageId: string, x: number, y: number) => {
        socketRef.current?.emit('cursor:move', { pageId, x, y });
    }, []);

    return {
        emitObjectAdded,
        emitObjectModified,
        emitObjectRemoved,
        emitClear,
        emitCursorMove,
    };
}
