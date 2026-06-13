# ✏️ Drafty

> Współdzielona tablica rysunkowa w czasie rzeczywistym — rysuj razem z innymi, gdziekolwiek jesteś.

🌐 **Live demo:** [frontend-4k6f.onrender.com](https://frontend-4k6f.onrender.com)

---

## 📋 Spis treści

- [O projekcie](#-o-projekcie)
- [Funkcje](#-funkcje)
- [Stos technologiczny](#-stos-technologiczny)
- [Architektura](#-architektura)
- [Jak działa synchronizacja](#-jak-działa-synchronizacja)
- [Uruchomienie lokalne](#-uruchomienie-lokalne)
- [Zmienne środowiskowe](#-zmienne-środowiskowe)
- [Struktura projektu](#-struktura-projektu)

---

## 🎯 O projekcie

**Drafty** to aplikacja webowa umożliwiająca wieloosobowe rysowanie na wspólnej tablicy w czasie rzeczywistym. Każda zmiana — narysowana ścieżka, usunięty obiekt, nowa strona — jest natychmiast widoczna dla wszystkich uczestników sesji.

Projekt powstał w ramach kursu inżynierii oprogramowania (semestr 6).

**Zespół:** Szymon Basta · Dominik Gąsiorek · Arkadiusz Domżał

---

## ✨ Funkcje

| Funkcja | Opis |
|---|---|
| 🖊️ Rysowanie odręczne | Pisak z regulowanym rozmiarem i kolorem |
| 🧽 Gumka | Usuwanie narysowanych elementów |
| 🎨 Wybór koloru | Paleta 5 kolorów |
| ↩️ Cofanie (Ctrl+Z) | Stos historii zmian per strona |
| 📄 Format A4 | Obszar roboczy w proporcjach kartki A4 |
| 📑 Wielostronicowość | Tworzenie, usuwanie i zmiana nazw stron |
| 📤 Eksport PDF | Generowanie pliku PDF ze wszystkich stron |
| 🔄 Sync w czasie rzeczywistym | Rysunki widoczne u wszystkich natychmiast |
| 🖱️ Kursory uczestników | Widoczne pozycje i imiona innych użytkowników |
| 👁️ Ukrywanie rysunków | Możliwość ukrycia rysunków wybranej osoby |
| 🔗 Udostępnianie sesji | Kopiowanie linku zaproszenia jednym kliknięciem |
| 📡 Pomiar latencji | Wyświetlanie RTT i E2E w interfejsie |

---

## 🛠️ Stos technologiczny

### Frontend
- **React 18** + **TypeScript** — framework UI i statyczne typowanie
- **Fabric.js 5** — silnik canvas (rysowanie, serializacja obiektów)
- **Socket.io-client** — komunikacja real-time z serwerem
- **jsPDF** — generowanie plików PDF
- **React Router DOM** — routing (Lobby → Board)
- **Vite** — bundler i dev server

### Backend
- **Node.js** + **Express** — serwer HTTP
- **Socket.io** — obsługa połączeń WebSocket i rozgłaszanie zdarzeń
- **UUID** — generowanie unikalnych identyfikatorów sesji

### Infrastruktura
- **Docker** + **Docker Compose** — konteneryzacja całego środowiska
- **PostgreSQL 15** — trwałe przechowywanie sesji i uczestników

---

## 🏗️ Architektura

```
[Użytkownik A]          [Użytkownik B]
  przeglądarka            przeglądarka
      │                       │
   Socket.io             Socket.io
      └──────→ [Backend] ←────┘

         Socket.io Server
         • zarządza pokojami (sesjami)
         • przechowuje stan canvas w pamięci
         • rozgłasza zdarzenia do uczestników
                  │
            [PostgreSQL]
            • sessions
            • session_participants
```

Serwer przechowuje stan każdej sesji w pamięci (`Map sessions`) — dzięki temu nowy użytkownik dołączający do istniejącej sesji natychmiast otrzymuje pełny aktualny stan tablicy.

---

## 🔄 Jak działa synchronizacja

```
1. Użytkownik rysuje
        ↓
2. Fabric.js emituje zdarzenie path:created
        ↓
3. useCanvas serializuje ścieżkę do JSON
   i wysyła przez Socket.io (canvas:object-added)
        ↓
4. Serwer odbiera zdarzenie
   i rozgłasza je do wszystkich w pokoju
        ↓
5. Pozostali użytkownicy odbierają JSON
   → enlivenObjects odtwarza ścieżkę na ich canvas
```

Każdy obiekt ma przypisany `customId` (UUID) oraz `authorId` (username), co umożliwia identyfikację autora i lokalne ukrywanie rysunków.

---

## 🚀 Uruchomienie lokalne

### Wymagania
- Docker + Docker Compose
- Node.js 20+ (dla lokalnego devu bez Dockera)

### Z Dockerem (zalecane)

```bash
git clone <repo-url>
cd drafty

docker compose up --build
```

Aplikacja dostępna pod:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Bez Dockera

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (osobny terminal)
cd frontend
npm install
npm run dev
```

---

## ⚙️ Zmienne środowiskowe

### Frontend (`frontend/.env.local`)

```env
VITE_SOCKET_URL=http://localhost:3001
```

### Backend

| Zmienna | Domyślna | Opis |
|---|---|---|
| `PORT` | `3001` | Port serwera |
| `NODE_ENV` | `development` | Środowisko |

---

## 📁 Struktura projektu

```
drafty/
├── backend/
│   ├── src/
│   │   └── index.js          # Serwer Express + Socket.io
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Board/
│   │   │   │   ├── Board.tsx       # Główny widok tablicy
│   │   │   │   ├── Canvas.tsx      # Wrapper elementu canvas
│   │   │   │   ├── Toolbar.tsx     # Pasek narzędzi
│   │   │   │   ├── CursorOverlay.tsx  # Kursory innych użytkowników
│   │   │   │   ├── UsersPanel.tsx  # Lista uczestników
│   │   │   │   └── SharePanel.tsx  # Udostępnianie sesji
│   │   │   └── Lobby/
│   │   │       └── Lobby.tsx       # Ekran startowy
│   │   ├── hooks/
│   │   │   ├── useCanvas.ts    # Logika Fabric.js + zarządzanie stronami
│   │   │   └── useSocket.ts    # Połączenie Socket.io
│   │   └── types/
│   │       └── index.ts
│   ├── Dockerfile
│   └── package.json
├── database/
│   └── migrations/
│       └── 001_init.sql        # Schemat PostgreSQL
├── docker/
│   └── frontend.Dockerfile
└── docker-compose.yml
```
