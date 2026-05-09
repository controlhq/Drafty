import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { v4 as uuidv4 } from 'uuid';

export type Tool = 'pen' | 'eraser';
export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;
const CUSTOM_ID_KEY = 'customId';
const MAX_HISTORY = 50;

export interface PageInfo {
  id: string;
  name: string;
  objects: Record<string, any>;
}

type HistorySnapshot = Record<string, any>;

export function useCanvas(options: any = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<fabric.Canvas | null>(null);
  const isApplyingRemote = useRef(false);
  
  // --- GŁÓWNY MAGAZYN DANYCH ---
  // Używamy Ref, aby dane były dostępne natychmiastowo dla mechanizmów Fabric i Socketów
  const pagesRef = useRef<PageInfo[]>([{ id: uuidv4(), name: 'Strona 1', objects: {} }]);

  // --- HISTORIA COFANIA (per strona) ---
  const historyRef = useRef<Map<string, HistorySnapshot[]>>(new Map());
  const isUndoingRef = useRef(false);
  
  // Stany Reacta do odświeżania komponentów UI (Toolbar, Listy stron)
  const [pages, setPagesState] = useState<PageInfo[]>(pagesRef.current);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentColor, setCurrentColorState] = useState('#000000');

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Ref do śledzenia indeksu wewnątrz callbacków Fabric (omijamy closure problem)
  const currentPageIndexRef = useRef(0);
  useEffect(() => {
    currentPageIndexRef.current = currentPageIndex;
  }, [currentPageIndex]);

  // --- HISTORIA: HELPERS ---

  const getHistory = useCallback((pageId: string): HistorySnapshot[] => {
    if (!historyRef.current.has(pageId)) {
      historyRef.current.set(pageId, []);
    }
    return historyRef.current.get(pageId)!;
  }, []);

  const pushHistory = useCallback((pageId: string, snapshot: HistorySnapshot) => {
    const history = getHistory(pageId);
    history.push(snapshot);
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
  }, [getHistory]);

  // --- LOGIKA WEWNĘTRZNA ---

  const getCanvasData = useCallback(() => {
    if (!canvas.current) return {};
    const data: Record<string, any> = {};
    canvas.current.getObjects().forEach((obj: any) => {
      if (obj.customId) {
        data[obj.customId] = obj.toJSON([CUSTOM_ID_KEY]);
      }
    });
    return data;
  }, []);

  const loadDataToCanvas = useCallback((data: Record<string, any>) => {
    if (!canvas.current) return;
    const c = canvas.current;

    isApplyingRemote.current = true;
    c.clear();
    c.setBackgroundColor('#ffffff', () => {
      const objects = Object.values(data);
      if (objects.length === 0) {
        c.renderAll();
        isApplyingRemote.current = false;
        return;
      }

      fabric.util.enlivenObjects(objects, (enlivened: fabric.Object[]) => {
        enlivened.forEach((obj, i) => {
          (obj as any).customId = Object.keys(data)[i];
          obj.selectable = false;
          obj.evented = false;
          c.add(obj);
        });
        c.renderAll();
        isApplyingRemote.current = false;
      }, 'fabric');
    });
  }, []);

  // --- INICJALIZACJA PŁÓTNA ---

  useEffect(() => {
    if (!canvasRef.current || canvas.current) return;

    const c = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      backgroundColor: '#ffffff',
      width: A4_WIDTH,
      height: A4_HEIGHT,
      selection: false,
    });

    canvas.current = c;

    c.on('path:created', (e: any) => {
      if (isApplyingRemote.current || isUndoingRef.current) return;
      const id = uuidv4();
      e.path.customId = id;
      e.path.selectable = false;
      
      const activePageId = pagesRef.current[currentPageIndexRef.current].id;

      // Zapisz snapshot aktualnego stanu (po narysowaniu ścieżki)
      const snapshot = getCanvasData();
      pushHistory(activePageId, snapshot);

      optionsRef.current.onObjectAdded?.(activePageId, id, e.path.toJSON([CUSTOM_ID_KEY]));
    });

    // Skrót klawiaturowy Ctrl+Z / Cmd+Z
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undoRef.current?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Wczytaj stan początkowy
    loadDataToCanvas(pagesRef.current[0].objects);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      c.dispose();
      canvas.current = null;
    };
  }, []);

  // --- COFANIE (UNDO) ---

  // Ref żeby uniknąć closure problem z useEffect (listener klawiatury)
  const undoRef = useRef<(() => void) | null>(null);

  const undo = useCallback(() => {
    const activePageId = pagesRef.current[currentPageIndexRef.current].id;
    const history = getHistory(activePageId);

    if (history.length === 0) return;

    isUndoingRef.current = true;

    // Usuń ostatni snapshot (aktualny stan)
    history.pop();

    // Przywróć poprzedni (lub pusty jeśli historia wyczerpana)
    const prevSnapshot = history.length > 0 ? history[history.length - 1] : {};
    pagesRef.current[currentPageIndexRef.current].objects = { ...prevSnapshot };
    loadDataToCanvas(prevSnapshot);

    setTimeout(() => {
      isUndoingRef.current = false;
    }, 50);
  }, [getHistory, loadDataToCanvas]);

  useEffect(() => {
    undoRef.current = undo;
  }, [undo]);

  // --- ZARZĄDZANIE STRONAMI ---

  const switchToPage = useCallback((newIndex: number) => {
    if (!canvas.current || newIndex === currentPageIndex) return;

    // 1. Zapisz stan obecnej strony
    pagesRef.current[currentPageIndex].objects = getCanvasData();

    // 2. Przełącz indeks
    setCurrentPageIndex(newIndex);
    
    // 3. Załaduj dane nowej strony
    const nextData = pagesRef.current[newIndex].objects || {};
    loadDataToCanvas(nextData);
  }, [currentPageIndex, getCanvasData, loadDataToCanvas]);

  const addPage = useCallback(() => {
    pagesRef.current[currentPageIndex].objects = getCanvasData();

    const newPage: PageInfo = { 
      id: uuidv4(), 
      name: `Strona ${pagesRef.current.length + 1}`, 
      objects: {} 
    };
    
    pagesRef.current.push(newPage);
    setPagesState([...pagesRef.current]);
    switchToPage(pagesRef.current.length - 1);
  }, [currentPageIndex, getCanvasData, switchToPage]);

  const deletePage = useCallback((index: number) => {
    if (pagesRef.current.length <= 1) return;

    // Wyczyść historię usuwanej strony
    historyRef.current.delete(pagesRef.current[index].id);

    pagesRef.current.splice(index, 1);
    
    let nextIndex = currentPageIndex;
    if (nextIndex >= pagesRef.current.length) {
      nextIndex = pagesRef.current.length - 1;
    }

    setPagesState([...pagesRef.current]);
    setCurrentPageIndex(nextIndex);
    loadDataToCanvas(pagesRef.current[nextIndex].objects || {});
  }, [currentPageIndex, loadDataToCanvas]);

  const renamePage = useCallback((index: number, newName: string) => {
    if (!newName.trim()) return;
    pagesRef.current[index].name = newName;
    setPagesState([...pagesRef.current]);
  }, []);

  // --- OBSŁUGA ZDARZEŃ ZDALNYCH (SOCKETS) ---

  const applyRemoteObject = useCallback((pageId: string, objectId: string, fabricJSON: any) => {
    const page = pagesRef.current.find(p => p.id === pageId);
    if (page) {
      page.objects[objectId] = fabricJSON;
    }

    // Jeśli to aktualna strona, renderujemy "na żywo"
    if (pageId === pagesRef.current[currentPageIndexRef.current].id && canvas.current) {
      isApplyingRemote.current = true;
      fabric.util.enlivenObjects([fabricJSON], (enlivened: fabric.Object[]) => {
        const obj = enlivened[0];
        (obj as any).customId = objectId;
        obj.selectable = false;
        obj.evented = false;
        canvas.current?.add(obj);
        canvas.current?.renderAll();
        isApplyingRemote.current = false;
      }, 'fabric');
    }
  }, []);

  const removeRemoteObject = useCallback((pageId: string, objectId: string) => {
    const page = pagesRef.current.find(p => p.id === pageId);
    if (page) {
      delete page.objects[objectId];
    }

    if (pageId === pagesRef.current[currentPageIndexRef.current].id && canvas.current) {
      const obj = canvas.current.getObjects().find((o: any) => o.customId === objectId);
      if (obj) {
        canvas.current.remove(obj);
        canvas.current.renderAll();
      }
    }
  }, []);

  const clearPageObjects = useCallback((pageId: string) => {
    const page = pagesRef.current.find(p => p.id === pageId);
    if (page) page.objects = {};

    // Wyczyść też historię tej strony
    historyRef.current.set(pageId, []);
    
    if (pageId === pagesRef.current[currentPageIndexRef.current].id) {
      canvas.current?.clear().setBackgroundColor('#ffffff').renderAll();
    }
  }, []);

  // --- EKSPORT DO PDF ---

  const exportToPDF = useCallback(async () => {
    // Lazy import — nie obciąża startu aplikacji
    const { jsPDF } = await import('jspdf');

    // Zapisz stan aktualnej strony przed eksportem
    pagesRef.current[currentPageIndexRef.current].objects = getCanvasData();

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const PDF_W = 210;
    const PDF_H = 297;

    for (let i = 0; i < pagesRef.current.length; i++) {
      const page = pagesRef.current[i];
      if (i > 0) pdf.addPage();

      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = A4_WIDTH;
      tmpCanvas.height = A4_HEIGHT;

      await new Promise<void>((resolve) => {
        const tmpFabric = new fabric.Canvas(tmpCanvas, {
          backgroundColor: '#ffffff',
          width: A4_WIDTH,
          height: A4_HEIGHT,
        });

        const objects = Object.values(page.objects);

        if (objects.length === 0) {
          const dataUrl = tmpFabric.toDataURL({ format: 'jpeg', quality: 0.95 });
          pdf.addImage(dataUrl, 'JPEG', 0, 0, PDF_W, PDF_H);
          tmpFabric.dispose();
          resolve();
          return;
        }

        fabric.util.enlivenObjects(objects, (enlivened: fabric.Object[]) => {
          enlivened.forEach((obj, idx) => {
            (obj as any).customId = Object.keys(page.objects)[idx];
            tmpFabric.add(obj);
          });
          tmpFabric.renderAll();

          const dataUrl = tmpFabric.toDataURL({ format: 'jpeg', quality: 0.95 });
          pdf.addImage(dataUrl, 'JPEG', 0, 0, PDF_W, PDF_H);
          tmpFabric.dispose();
          resolve();
        }, 'fabric');
      });
    }

    pdf.save('drafty-eksport.pdf');
  }, [getCanvasData]);

  // --- EKSPORT METOD ---

  return {
    canvasRef,
    pages,
    currentPageIndex,
    currentColor,
    setTool: (t: Tool) => {
      if (canvas.current) {
        canvas.current.isDrawingMode = true;
        canvas.current.freeDrawingBrush.color = t === 'eraser' ? '#ffffff' : currentColor;
      }
    },
    setColor: (c: string) => {
      setCurrentColorState(c);
      if (canvas.current) canvas.current.freeDrawingBrush.color = c;
    },
    setBrushSize: (s: number) => {
      if (canvas.current) canvas.current.freeDrawingBrush.width = s;
    },
    clearCanvas: () => {
      const activePageId = pagesRef.current[currentPageIndexRef.current].id;
      historyRef.current.set(activePageId, []);
      canvas.current?.clear().setBackgroundColor('#ffffff').renderAll();
    },
    undo,
    exportToPDF,
    addPage,
    switchToPage,
    deletePage,
    renamePage,
    applyRemoteObject,
    removeRemoteObject,
    clearPageObjects,
    getCurrentPageId: () => pagesRef.current[currentPageIndex].id,
    loadCanvasState: (allState: any) => {
      const serverPages = Object.keys(allState).map((pid, idx) => ({
        id: pid,
        name: `Strona ${idx + 1}`,
        objects: allState[pid]
      }));

      if (serverPages.length > 0) {
        pagesRef.current = serverPages;
        setPagesState([...pagesRef.current]);
        loadDataToCanvas(pagesRef.current[0].objects);
      }
    }
  };
}