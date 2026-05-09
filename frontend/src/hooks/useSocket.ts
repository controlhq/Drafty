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

export interface PageInfo {
    id: string;
    name: string;
}

export interface SessionJoinedPayload {
    user: UserInfo;
    users: UserInfo[];
    canvasObjects: Record<string, object>;
    pages: PageInfo[];
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
    onLatencyUpdate?: (latency: number) => void;
    onE2ELatencyUpdate?: (latency: number) => void;
    // Synchronizacja stron
    onPageAdded?: (page: PageInfo) => void;
    onPageDeleted?: (pageId: string) => void;
    onPageRenamed?: (pageId: string, name: string) => void;
}

export function useSocket(options: UseSocketOptions) {
    const socketRef = useRef<Socket | null>(null);
    const optionsRef = useRef(options);
    optionsRef.current = options;

    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ['websocket'] });
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

        socket.on('canvas:object-added', ({ pageId, objectId, fabricObject }: {
            pageId: string; objectId: string; fabricObject: object;
        }) => {
            optionsRef.current.onObjectAdded(pageId, objectId, fabricObject);
        });

        socket.on('canvas:object-modified', ({ pageId, objectId, fabricObject }: {
            pageId: string; objectId: string; fabricObject: object;
        }) => {
            optionsRef.current.onObjectModified(pageId, objectId, fabricObject);
        });

        socket.on('canvas:object-removed', ({ pageId, objectId }: {
            pageId: string; objectId: string;
        }) => {
            optionsRef.current.onObjectRemoved(pageId, objectId);
        });

        socket.on('canvas:clear', ({ pageId }: { pageId: string }) => {
            optionsRef.current.onCanvasClear(pageId);
        });

        // Kursor — teraz zawiera pageId z serwera
        socket.on('cursor:move', (cursor: RemoteCursor) => {
            optionsRef.current.onCursorMove(cursor);
        });

        socket.on('user-joined', (user: UserInfo) => {
            optionsRef.current.onUserJoined(user);
        });

        socket.on('user-left', ({ socketId, username }: { socketId: string; username: string }) => {
            optionsRef.current.onUserLeft(socketId, username);
        });

        // Latency
        socket.on('pong-latency', ({ clientTs }: { clientTs: number; serverTs: number }) => {
            const rtt = Date.now() - clientTs;
            optionsRef.current.onLatencyUpdate?.(rtt);
        });

        const latencyInterval = setInterval(() => {
            socket.emit('ping-latency', Date.now());
        }, 3000);

        // --- SYNCHRONIZACJA STRON ---

        socket.on('page:added', ({ page }: { page: PageInfo }) => {
            optionsRef.current.onPageAdded?.(page);
        });

        socket.on('page:deleted', ({ pageId }: { pageId: string }) => {
            optionsRef.current.onPageDeleted?.(pageId);
        });

        socket.on('page:renamed', ({ pageId, name }: { pageId: string; name: string }) => {
            optionsRef.current.onPageRenamed?.(pageId, name);
        });

        return () => {
            clearInterval(latencyInterval);
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

    // Kursor emitowany z pageId
    const emitCursorMove = useCallback((pageId: string, x: number, y: number) => {
        socketRef.current?.emit('cursor:move', { pageId, x, y });
    }, []);

    // Emity synchronizacji stron
    const emitPageAdded = useCallback((page: PageInfo) => {
        socketRef.current?.emit('page:added', { page });
    }, []);

    const emitPageDeleted = useCallback((pageId: string) => {
        socketRef.current?.emit('page:deleted', { pageId });
    }, []);

    const emitPageRenamed = useCallback((pageId: string, name: string) => {
        socketRef.current?.emit('page:renamed', { pageId, name });
    }, []);

    return {
        emitObjectAdded,
        emitObjectModified,
        emitObjectRemoved,
        emitClear,
        emitCursorMove,
        emitPageAdded,
        emitPageDeleted,
        emitPageRenamed,
    };
}