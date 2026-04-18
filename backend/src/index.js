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

// Mapa sesji: sessionId -> { users: Map<socketId, userInfo>, canvasState: [] }
const sessions = new Map();

function getOrCreateSession(sessionId) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            users: new Map(),
            // Przechowujemy pełny stan canvas jako listę obiektów fabric JSON
            canvasObjects: {},
        });
    }
    return sessions.get(sessionId);
}

// REST: sprawdź ilu userów jest w sesji
app.get('/api/session/:sessionId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) return res.json({ users: [], objectCount: 0 });
    res.json({
        users: Array.from(session.users.values()),
        objectCount: Object.keys(session.canvasObjects).length,
    });
});

// Kolory dla kursorów — każdy user dostaje inny
const CURSOR_COLORS = [
    '#ef4444', // czerwony
    '#3b82f6', // niebieski
    '#22c55e', // zielony
    '#f59e0b', // pomarańczowy
    '#a855f7', // fioletowy
    '#ec4899', // różowy
    '#14b8a6', // turkusowy
];

io.on('connection', (socket) => {
    let currentSessionId = null;
    let currentUser = null;

    // --- Dołączenie do sesji ---
    socket.on('join-session', ({ sessionId, username }) => {
        currentSessionId = sessionId;
        const session = getOrCreateSession(sessionId);

        // Przydziel kolor kursora
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

        // Wyślij nowemu userowi pełny stan canvas
        socket.emit('session-joined', {
            user: currentUser,
            users: Array.from(session.users.values()),
            canvasObjects: session.canvasObjects,
        });

        // Poinformuj innych o nowym użytkowniku
        socket.to(sessionId).emit('user-joined', currentUser);

        console.log(`[${sessionId}] ${username} dołączył (${socket.id})`);
    });

    // --- Rysowanie: nowy obiekt dodany ---
    socket.on('canvas:object-added', ({ objectId, fabricObject }) => {
        if (!currentSessionId) return;
        const session = sessions.get(currentSessionId);
        if (!session) return;

        // Zapisz obiekt w stanie sesji
        session.canvasObjects[objectId] = fabricObject;

        // Rozgłoś do pozostałych
        socket.to(currentSessionId).emit('canvas:object-added', {
            objectId,
            fabricObject,
            senderId: socket.id,
        });
    });

    // --- Rysowanie: obiekt zmodyfikowany ---
    socket.on('canvas:object-modified', ({ objectId, fabricObject }) => {
        if (!currentSessionId) return;
        const session = sessions.get(currentSessionId);
        if (!session) return;

        session.canvasObjects[objectId] = fabricObject;

        socket.to(currentSessionId).emit('canvas:object-modified', {
            objectId,
            fabricObject,
            senderId: socket.id,
        });
    });

    // --- Rysowanie: obiekt usunięty ---
    socket.on('canvas:object-removed', ({ objectId }) => {
        if (!currentSessionId) return;
        const session = sessions.get(currentSessionId);
        if (!session) return;

        delete session.canvasObjects[objectId];

        socket.to(currentSessionId).emit('canvas:object-removed', {
            objectId,
            senderId: socket.id,
        });
    });

    // --- Wyczyszczenie całej tablicy ---
    socket.on('canvas:clear', () => {
        if (!currentSessionId) return;
        const session = sessions.get(currentSessionId);
        if (!session) return;

        session.canvasObjects = {};

        socket.to(currentSessionId).emit('canvas:clear', {
            senderId: socket.id,
        });
    });

    // --- Pozycja kursora ---
    socket.on('cursor:move', ({ x, y }) => {
        if (!currentSessionId || !currentUser) return;
        currentUser.cursor = { x, y };

        socket.to(currentSessionId).emit('cursor:move', {
            socketId: socket.id,
            username: currentUser.username,
            cursorColor: currentUser.cursorColor,
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

        // Usuń pustą sesję po 30 minutach nieaktywności
        if (session.users.size === 0) {
            setTimeout(() => {
                const s = sessions.get(currentSessionId);
                if (s && s.users.size === 0) {
                    sessions.delete(currentSessionId);
                    console.log(`[${currentSessionId}] Sesja usunięta (brak użytkowników)`);
                }
            }, 30 * 60 * 1000);
        }

        console.log(
            `[${currentSessionId}] ${currentUser?.username} odłączył się`
        );
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Serwer Drafty działa na porcie ${PORT}`);
});
