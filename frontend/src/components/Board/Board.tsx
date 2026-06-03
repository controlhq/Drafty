import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useCanvas, Tool } from '../../hooks/useCanvas';
import { useSocket, RemoteCursor, UserInfo, SessionJoinedPayload, PageInfo } from '../../hooks/useSocket';
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
  const [latency, setLatency] = useState<number | null>(null);
  const [e2eLatency, setE2ELatency] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Własne socketId — potrzebne do tagowania własnych obiektów w useCanvas
  const mySocketIdRef = useRef<string>('');

  const applyRemoteRef = useRef<((pageId: string, id: string, obj: object, authorId: string) => void) | null>(null);
  const removeRemoteRef = useRef<((pageId: string, id: string) => void) | null>(null);
  const canvasHookRef = useRef<ReturnType<typeof useCanvas> | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- SOCKET CALLBACKS ---

  const handleSessionJoined = useCallback(({ users: sessionUsers, canvasObjects, pages }: SessionJoinedPayload) => {
    setConnected(true);
    setUsers(sessionUsers);
    canvasHookRef.current?.loadCanvasState(canvasObjects as Record<string, Record<string, object>>, pages);
  }, []);

  const handleObjectAdded = useCallback((pageId: string, objectId: string, fabricObject: object, authorId: string) => {
    applyRemoteRef.current?.(pageId, objectId, fabricObject, authorId);
  }, []);

  const handleObjectModified = useCallback((pageId: string, objectId: string, fabricObject: object, authorId: string) => {
    applyRemoteRef.current?.(pageId, objectId, fabricObject, authorId);
  }, []);

  const handleObjectRemoved = useCallback((pageId: string, objectId: string) => {
    removeRemoteRef.current?.(pageId, objectId);
  }, []);

  const handleCursorMove = useCallback((cursor: RemoteCursor) => {
    setRemoteCursors((prev) => ({ ...prev, [cursor.socketId]: cursor }));
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

  const handlePageAdded = useCallback((page: { id: string; name: string }) => {
    canvasHookRef.current?.addRemotePage(page);
    showNotification(`Dodano nową stronę: ${page.name}`);
  }, []);

  const handlePageDeleted = useCallback((pageId: string) => {
    canvasHookRef.current?.deleteRemotePage(pageId);
  }, []);

  const handlePageRenamed = useCallback((pageId: string, name: string) => {
    canvasHookRef.current?.renameRemotePage(pageId, name);
  }, []);

  // --- HOOKS ---
  const {
    emitObjectAdded,
    emitObjectModified,
    emitObjectRemoved,
    emitClear,
    emitCursorMove,
    emitPageAdded,
    emitPageDeleted,
    emitPageRenamed,
    getSocketId,
  } = useSocket({
    sessionId: sessionId!,
    username,
    onSessionJoined: handleSessionJoined,
    onObjectAdded: handleObjectAdded,
    onObjectModified: handleObjectModified,
    onObjectRemoved: handleObjectRemoved,
    onCanvasClear: (pageId) => {
      canvasHookRef.current?.clearPageObjects(pageId);
    },
    onCursorMove: handleCursorMove,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
    onLatencyUpdate: setLatency,
    onE2ELatencyUpdate: setE2ELatency,
    onPageAdded: handlePageAdded,
    onPageDeleted: handlePageDeleted,
    onPageRenamed: handlePageRenamed,
    // Zapisz własne socketId zaraz po połączeniu
    onSocketIdReady: (id) => {
      mySocketIdRef.current = id;
    },
  });

  const canvasHook = useCanvas({
    // Własne socketId przekazywane do canvas hooka przez callback
    mySocketId: () => mySocketIdRef.current || getSocketId() || 'local',
    onObjectAdded: (pageId: string, objectId: string, fabricObject: object) =>
      emitObjectAdded(pageId, objectId, fabricObject),
    onObjectModified: (pageId: string, objectId: string, fabricObject: object) =>
      emitObjectModified(pageId, objectId, fabricObject),
    onObjectRemoved: (pageId: string, objectId: string) =>
      emitObjectRemoved(pageId, objectId),
    onCursorMove: (pageId: string, x: number, y: number) =>
      emitCursorMove(pageId, x, y),
    onPageAdded: (page: PageInfo) => emitPageAdded(page),
    onPageDeleted: (pageId: string) => emitPageDeleted(pageId),
    onPageRenamed: (pageId: string, name: string) => emitPageRenamed(pageId, name),
  });

  useEffect(() => {
    canvasHookRef.current = canvasHook;
  });

  useEffect(() => {
    applyRemoteRef.current = canvasHook.applyRemoteObject;
    removeRemoteRef.current = canvasHook.removeRemoteObject;
  }, [canvasHook.applyRemoteObject, canvasHook.removeRemoteObject]);

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

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await canvasHook.exportToPDF();
      showNotification('✅ PDF został zapisany');
    } catch (err) {
      console.error('Błąd eksportu PDF:', err);
      showNotification('❌ Błąd podczas eksportu PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // --- TOGGLE WIDOCZNOŚCI UŻYTKOWNIKA ---
  const handleToggleVisibility = useCallback((socketId: string, makeVisible: boolean) => {
    console.log('TOGGLE', socketId, makeVisible);
    canvasHook.setUserVisibility(socketId, makeVisible);
    const user = users.find(u => u.socketId === socketId);
    if (user) {
      showNotification(
        makeVisible
          ? `👁️ Pokazano rysunki użytkownika ${user.username}`
          : `🙈 Ukryto rysunki użytkownika ${user.username}`
      );
    }
  }, [canvasHook.setUserVisibility, users]);

  if (!sessionId) {
    navigate('/');
    return null;
  }

  return (
      <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#f3f4f6' }}>
        <Toolbar
            currentTool={currentTool}
            onToolChange={handleToolChange}
            brushSize={brushSize}
            onBrushSizeChange={handleBrushSizeChange}
            currentColor={canvasHook.currentColor}
            onColorChange={canvasHook.setColor}
            onClear={handleClearCanvas}
            onUndo={canvasHook.undo}
            onExportPDF={handleExportPDF}
            isExporting={isExporting}
            connected={connected}
            username={username}
            latency={latency}
            e2eLatency={e2eLatency}
            pages={canvasHook.pages}
            currentPageIndex={canvasHook.currentPageIndex}
            onAddPage={canvasHook.addPage}
            onSwitchToPage={canvasHook.switchToPage}
            onDeletePage={canvasHook.deletePage}
            onRenamePage={canvasHook.renamePage}
        />

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          paddingTop: '60px',
          overflow: 'auto',
        }}>
          <div style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: 'white' }}>
            <Canvas canvasRef={canvasHook.canvasRef} />
          </div>
        </div>

        <CursorOverlay cursors={Object.values(remoteCursors)} currentPageId={canvasHook.getCurrentPageId()} />

        {/* UsersPanel z obsługą widoczności */}
        <UsersPanel
            users={users}
            currentUsername={username}
            hiddenAuthors={canvasHook.hiddenAuthors}
            onToggleVisibility={handleToggleVisibility}
        />

        <SharePanel sessionId={sessionId} />

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
