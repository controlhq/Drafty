import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { v4 as uuidv4 } from 'uuid';

export type Tool = 'pen' | 'eraser';
export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;
const CUSTOM_ID_KEY = 'customId';

export interface PageInfo {
  id: string;
  name: string;
  objects: Record<string, any>;
}

export function useCanvas(options: any = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<fabric.Canvas | null>(null);
  const isApplyingRemote = useRef(false);
  
  // --- GŁÓWNY MAGAZYN DANYCH ---
  // Używamy Ref, aby dane były dostępne natychmiastowo dla mechanizmów Fabric i Socketów
  const pagesRef = useRef<PageInfo[]>([{ id: uuidv4(), name: 'Strona 1', objects: {} }]);
  
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
      if (isApplyingRemote.current) return;
      const id = uuidv4();
      e.path.customId = id;
      e.path.selectable = false;
      
      const activePageId = pagesRef.current[currentPageIndexRef.current].id;
      optionsRef.current.onObjectAdded?.(activePageId, id, e.path.toJSON([CUSTOM_ID_KEY]));
    });

    // Wczytaj stan początkowy
    loadDataToCanvas(pagesRef.current[0].objects);

    return () => {
      c.dispose();
      canvas.current = null;
    };
  }, []);

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
    
    if (pageId === pagesRef.current[currentPageIndexRef.current].id) {
      canvas.current?.clear().setBackgroundColor('#ffffff').renderAll();
    }
  }, []);

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
      canvas.current?.clear().setBackgroundColor('#ffffff').renderAll();
    },
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