import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useCanvas, Tool } from '../../hooks/useCanvas';
import { useSocket, RemoteCursor, UserInfo } from '../../hooks/useSocket';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import { CursorOverlay } from './CursorOverlay';
import { UsersPanel } from './UsersPanel';
import { SharePanel } from './SharePanel';

export function Board() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const username = searchParams.get('username') || 'Anonim';

  // --- STANY UI ---
  const [currentTool, setCurrentTool] = useState<Tool>('pen');
  const [brushSize, setBrushSizeState] = useState(3);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const [connected, setConnected] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // --- REFERENCJE DO METOD ZDALNYCH ---
  const applyRemoteRef = useRef<((pageId: string, id: string, obj: object) => void) | null>(null);
  const removeRemoteRef = useRef<((pageId: string, id: string) => void) | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- SOCKET CALLBACKS ---
  const handleSessionJoined = useCallback(({ user, users: sessionUsers, canvasObjects }: {
    user: UserInfo;
    users: UserInfo[];
    canvasObjects: Record<string, Record<string, object>>;
  }) => {
    setConnected(true);
    setUsers(sessionUsers);
    // Ładowanie początkowego stanu tablicy (wszystkich stron) z serwera
    canvasHook.loadCanvasState(canvasObjects);
  }, []);

  const handleObjectAdded = useCallback((pageId: string, objectId: string, fabricObject: object) => {
    applyRemoteRef.current?.(pageId, objectId, fabricObject);
  }, []);

  const handleObjectModified = useCallback((pageId: string, objectId: string, fabricObject: object) => {
    applyRemoteRef.current?.(pageId, objectId, fabricObject);
  }, []);

  const handleObjectRemoved = useCallback((pageId: string, objectId: string) => {
    removeRemoteRef.current?.(pageId, objectId);
  }, []);

  const handleCursorMove = useCallback((pageId: string, cursor: { x: number; y: number; socketId: string }) => {
    setRemoteCursors((prev) => ({ ...prev, [cursor.socketId]: { ...cursor, pageId } }));
  }, []);

  const handleUserJoined = useCallback((user: UserInfo) => {
    setUsers((prev) => {
      if (prev.find((u) => u.socketId === user.socketId)) return prev;
      return [...prev, user];
    });
    showNotification(`${user.username} dołączył do tablicy`);
  }, []);

  const handleUserLeft = useCallback((socketId: string, uname: string) => {
    setUsers((prev) => prev.filter((u) => u.socketId !== socketId));
    setRemoteCursors((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
    showNotification(`${uname} opuścił tablicę`);
  }, []);

  // --- HOOKS ---
  const { emitObjectAdded, emitObjectModified, emitObjectRemoved, emitClear, emitCursorMove } = useSocket({
    sessionId: sessionId!,
    username,
    onSessionJoined: handleSessionJoined,
    onObjectAdded: handleObjectAdded,
    onObjectModified: handleObjectModified,
    onObjectRemoved: handleObjectRemoved,
    onCanvasClear: (pageId) => {
      canvasHook.clearPageObjects(pageId);
    },
    onCursorMove: handleCursorMove,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
  });

  const canvasHook = useCanvas({
    onObjectAdded: (pageId, objectId, fabricObject) => emitObjectAdded(pageId, objectId, fabricObject),
    onObjectModified: (pageId, objectId, fabricObject) => emitObjectModified(pageId, objectId, fabricObject),
    onCursorMove: (pageId, x, y) => emitCursorMove(pageId, x, y),
  });

  // --- SYNCHRONIZACJA METOD ---
  useEffect(() => {
    const h = canvasHook as any;
    applyRemoteRef.current = h.applyRemoteObject;
    removeRemoteRef.current = h.removeRemoteObject;
  }, [canvasHook]);

  // --- HANDLERY UI ---
  const handleToolChange = (tool: Tool) => {
    setCurrentTool(tool);
    canvasHook.setTool(tool);
  };

  const handleBrushSizeChange = (size: number) => {
    setBrushSizeState(size);
    canvasHook.setBrushSize(size);
  };

  const handleClearCanvas = () => {
    canvasHook.clearCanvas();
    emitClear(canvasHook.getCurrentPageId());
  };

  if (!sessionId) {
    navigate('/');
    return null;
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#f3f4f6' }}>
      {/* Pasek narzędzi */}
      <Toolbar
        currentTool={currentTool}
        onToolChange={handleToolChange}
        brushSize={brushSize}
        onBrushSizeChange={handleBrushSizeChange}
        currentColor={canvasHook.currentColor}
        onColorChange={canvasHook.setColor}
        onClear={handleClearCanvas}
        connected={connected}
        username={username}
        pages={canvasHook.pages}
        currentPageIndex={canvasHook.currentPageIndex}
        onAddPage={canvasHook.addPage}
        onSwitchToPage={canvasHook.switchToPage}
        onDeletePage={canvasHook.deletePage}
      />

      {/* Płótno (Wycentrowane) */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%', 
        paddingTop: '60px', // Miejsce na toolbar
        overflow: 'auto' 
      }}>
        <div style={{ boxShadow: '0 0 40px rgba(0,0,0,0.1)', background: 'white' }}>
          <Canvas canvasRef={canvasHook.canvasRef} />
        </div>
      </div>

      {/* Nakładki UI */}
      <CursorOverlay cursors={Object.values(remoteCursors)} currentPageId={canvasHook.getCurrentPageId()} />
      <UsersPanel users={users} currentUsername={username} />
      <SharePanel sessionId={sessionId} />

      {/* System powiadomień */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(30,27,75,0.95)',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '100px',
          fontSize: '14px',
          fontWeight: 500,
          border: '1px solid rgba(99,102,241,0.4)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
          {notification}
        </div>
      )}
    </div>
  );
}