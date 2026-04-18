import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = "https://drafty-20pq.onrender.com";

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
    onObjectAdded: (objectId: string, fabricObject: object) => void;
    onObjectModified: (objectId: string, fabricObject: object) => void;
    onObjectRemoved: (objectId: string) => void;
    onCanvasClear: () => void;
    onCursorMove: (cursor: RemoteCursor) => void;
    onUserJoined: (user: UserInfo) => void;
    onUserLeft: (socketId: string, username: string) => void;
}

export function useSocket(options: UseSocketOptions) {
    const socketRef = useRef<Socket | null>(null);
    const optionsRef = useRef(options);
    optionsRef.current = options;

    useEffect(() => {
        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join-session', {
                sessionId: options.sessionId,
                username: options.username,
            });
        });

        socket.on('session-joined', (payload: SessionJoinedPayload) => {
            optionsRef.current.onSessionJoined(payload);
        });

        socket.on('canvas:object-added', ({ objectId, fabricObject }: { objectId: string; fabricObject: object }) => {
            optionsRef.current.onObjectAdded(objectId, fabricObject);
        });

        socket.on('canvas:object-modified', ({ objectId, fabricObject }: { objectId: string; fabricObject: object }) => {
            optionsRef.current.onObjectModified(objectId, fabricObject);
        });

        socket.on('canvas:object-removed', ({ objectId }: { objectId: string }) => {
            optionsRef.current.onObjectRemoved(objectId);
        });

        socket.on('canvas:clear', () => {
            optionsRef.current.onCanvasClear();
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
            socket.disconnect();
        };
    }, [options.sessionId, options.username]);

    const emitObjectAdded = useCallback((objectId: string, fabricObject: object) => {
        socketRef.current?.emit('canvas:object-added', { objectId, fabricObject });
    }, []);

    const emitObjectModified = useCallback((objectId: string, fabricObject: object) => {
        socketRef.current?.emit('canvas:object-modified', { objectId, fabricObject });
    }, []);

    const emitObjectRemoved = useCallback((objectId: string) => {
        socketRef.current?.emit('canvas:object-removed', { objectId });
    }, []);

    const emitClear = useCallback(() => {
        socketRef.current?.emit('canvas:clear');
    }, []);

    const emitCursorMove = useCallback((x: number, y: number) => {
        socketRef.current?.emit('cursor:move', { x, y });
    }, []);

    return {
        emitObjectAdded,
        emitObjectModified,
        emitObjectRemoved,
        emitClear,
        emitCursorMove,
    };
}
