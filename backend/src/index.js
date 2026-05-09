const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Mapa sesji: sessionId -> { users: Map<socketId, userInfo>, canvasState, pages }
const sessions = new Map();

function getOrCreateSession(sessionId) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            users: new Map(),
            canvasState: {}, // pageId -> { objectId: fabricObject }
            pages: [],       // [{ id, name }] — lista stron w kolejności
        });
    }
    return sessions.get(sessionId);
}

// REST: sprawdź stan sesji
app.get('/api/session/:sessionId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) return res.json({ users: [], objectCount: 0 });
    const totalObjects = Object.values(session.canvasState).reduce(
        (sum, pageObjects) => sum + Object.keys(pageObjects).length, 0
    );
    res.json({
        users: Array.from(session.users.values()),
        objectCount: totalObjects,
    });
});

const CURSOR_COLORS = [
    '#ef4444',
    '#3b82f6',
    '#22c55e',
    '#f59e0b',
    '#a855f7',
    '#ec4899',
    '#14b8a6',
];

io.on('connection', (socket) => {
    let currentSessionId = null;
    let currentUser = null;

    // --- Dołączenie do sesji ---
    socket.on('join-session', ({ sessionId, username }) => {
        currentSessionId = sessionId;
        const session = getOrCreateSession(sessionId);

        const usedColors = new Set(
            Array.from(session.users.values()).map((u) => u.cursorColor)
        );
        const color =
            CURSOR_COLORS.find((c) => !usedColors.has(c)) ||
            CURSOR_COLORS[session.users.size % CURSOR_COLORS.length];

        currentUser = {
            socketId: socket.id,
            username,
            cursorColor: color,
            cursor: { x: 0, y: 0 },
        };

        session.users.set(socket.id, currentUser);
        socket.join(sessionId);

        // Wyślij TYLKO nowemu użytkownikowi pełny stan
        socket.emit('session-joined', {
            user: currentUser,
            users: Array.from(session.users.values()),
            canvasObjects: session.canvasState,
            pages: session.pages, // <-- lista stron z nazwami
        });

        // Pozostałym tylko info o nowym userze
        socket.to(sessionId).emit('user-joined', currentUser);

        console.log(`[${sessionId}] ${username} dołączył (${socket.id})`);
    });

    // --- Rysowanie: nowy obiekt ---
    socket.on('canvas:object-added', ({ pageId, objectId, fabricObject }) => {
        if (!currentSessionId) return;
        const session = sessions.get(currentSessionId);
        if (!session) return;

        if (!session.canvasState[pageId]) {
            session.canvasState[pageId] = {};
        }
        session.canvasState[pageId][objectId] = fabricObject;

        // Rozgłoś do pozostałych
        socket.to(currentSessionId).emit('canvas:object-added', {
            pageId,
            objectId,
            fabricObject,
            serverTs: Date.now(),
        });
    });

    // --- Rysowanie: obiekt zmodyfikowany ---
    socket.on('canvas:object-modified', ({ pageId, objectId, fabricObject }) => {
        if (!currentSessionId) return;
        const session = sessions.get(currentSessionId);
        if (!session) return;

        if (session.canvasState[pageId]) {
            session.canvasState[pageId][objectId] = fabricObject;
        }

        socket.to(currentSessionId).emit('canvas:object-modified', {
            pageId,
            objectId,
            fabricObject,
            serverTs: Date.now(),
        });
    });

    // --- Rysowanie: obiekt usunięty ---
    socket.on('canvas:object-removed', ({ pageId, objectId }) => {
        if (!currentSessionId) return;
        const session = sessions.get(currentSessionId);
        if (!session) return;

        if (session.canvasState[pageId]) {
            delete session.canvasState[pageId][objectId];
        }

        socket.to(currentSessionId).emit('canvas:object-removed', {
            pageId,
            objectId,
        });
    });

    // --- Wyczyszczenie strony ---
    socket.on('canvas:clear', ({ pageId }) => {
        if (!currentSessionId) return;
        const session = sessions.get(currentSessionId);
        if (!session) return;

        if (session.canvasState[pageId]) {
            session.canvasState[pageId] = {};
        }

        socket.to(currentSessionId).emit('canvas:clear', { pageId });
    });

    // --- SYNCHRONIZACJA STRON ---

    // Nowa strona dodana
    socket.on('page:added', ({ page }) => {
        if (!currentSessionId) return;
        const session = sessions.get(currentSessionId);
        if (!session) return;

        // Zapisz stronę w sesji jeśli jeszcze jej nie ma
        if (!session.pages.find(p => p.id === page.id)) {
            session.pages.push({ id: page.id, name: page.name });
        }
        if (!session.canvasState[page.id]) {
            session.canvasState[page.id] = {};
        }

        socket.to(currentSessionId).emit('page:added', { page });
    });

    // Strona usunięta
    socket.on('page:deleted', ({ pageId }) => {
        if (!currentSessionId) return;
        const session = sessions.get(currentSessionId);
        if (!session) return;

        session.pages = session.pages.filter(p => p.id !== pageId);
        delete session.canvasState[pageId];

        socket.to(currentSessionId).emit('page:deleted', { pageId });
    });

    // Strona przemianowana
    socket.on('page:renamed', ({ pageId, name }) => {
        if (!currentSessionId) return;
        const session = sessions.get(currentSessionId);
        if (!session) return;

        const page = session.pages.find(p => p.id === pageId);
        if (page) page.name = name;

        socket.to(currentSessionId).emit('page:renamed', { pageId, name });
    });

    // --- Ping/pong do pomiaru latency ---
    socket.on('ping-latency', (clientTs) => {
        socket.emit('pong-latency', { clientTs, serverTs: Date.now() });
    });

    // --- Pozycja kursora (z pageId!) ---
    socket.on('cursor:move', ({ pageId, x, y }) => {
        if (!currentSessionId || !currentUser) return;
        currentUser.cursor = { x, y };

        socket.to(currentSessionId).emit('cursor:move', {
            socketId: socket.id,
            username: currentUser.username,
            cursorColor: currentUser.cursorColor,
            pageId, // <-- przekazujemy dalej
            x,
            y,
        });
    });

    // --- Rozłączenie ---
    socket.on('disconnect', () => {
        if (!currentSessionId) return;
        const session = sessions.get(currentSessionId);
        if (!session) return;

        session.users.delete(socket.id);

        io.to(currentSessionId).emit('user-left', {
            socketId: socket.id,
            username: currentUser?.username,
        });

        if (session.users.size === 0) {
            setTimeout(() => {
                const s = sessions.get(currentSessionId);
                if (s && s.users.size === 0) {
                    sessions.delete(currentSessionId);
                    console.log(`[${currentSessionId}] Sesja usunięta`);
                }
            }, 30 * 60 * 1000);
        }

        console.log(`[${currentSessionId}] ${currentUser?.username} odłączył się`);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Serwer Drafty działa na porcie ${PORT}`);
});