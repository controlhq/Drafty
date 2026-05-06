import { useEffect, useRef, RefObject, MutableRefObject, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { v4 as uuidv4 } from 'uuid';
import { PageInfo } from '../types';

export type Tool = 'pen' | 'eraser';

// A4 dimensions at 96 DPI: 210mm x 297mm = 794px x 1123px
export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;

export interface UseCanvasReturn {
  canvasRef: RefObject<HTMLCanvasElement>;
  canvas: MutableRefObject<fabric.Canvas | null>;
  isApplyingRemote: MutableRefObject<boolean>;
  setTool: (tool: Tool) => void;
  setBrushSize: (size: number) => void;
  setColor: (color: string) => void;
  currentColor: string;
  clearCanvas: () => void;
  // Page management
  pages: PageInfo[];
  currentPageIndex: number;
  addPage: () => void;
  switchToPage: (pageIndex: number) => void;
  deletePage: (pageIndex: number) => void;
  getCurrentPageId: () => string;
}

interface UseCanvasOptions {
  onObjectAdded?: (pageId: string, objectId: string, fabricObject: object) => void;
  onObjectModified?: (pageId: string, objectId: string, fabricObject: object) => void;
  onObjectRemoved?: (pageId: string) => void;
  onCursorMove?: (pageId: string, x: number, y: number) => void;
}

// Przechowujemy mapę customId -> fabric object
const CUSTOM_ID_KEY = 'customId';

export function useCanvas(options: UseCanvasOptions = {}): UseCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<fabric.Canvas | null>(null);
  const isApplyingRemote = useRef(false);
  const [currentColor, setCurrentColorState] = useState('#000000');
  const currentColorRef = useRef('#000000');
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Page management state
  const [pages, setPages] = useState<PageInfo[]>([{ id: uuidv4(), name: 'Page 1', objects: {} }]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const currentPageIdRef = useRef(pages[0].id);

  const updateCursor = (size: number) => {
    if (!canvas.current) return;
    const cursorSize = Math.max(size, 5);
    const svg = `<svg width="${cursorSize}" height="${cursorSize}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cursorSize / 2}" cy="${cursorSize / 2}" r="${size / 2}" fill="none" stroke="black" stroke-width="1"/>
    </svg>`;
    const encoded = btoa(svg);
    canvas.current.defaultCursor = `url(data:image/svg+xml;base64,${encoded}) ${cursorSize / 2} ${cursorSize / 2}, crosshair`;
  };

  const setTool = useCallback((tool: Tool) => {
    if (!canvas.current) return;
    if (tool === 'pen') {
      canvas.current.freeDrawingBrush.color = currentColorRef.current;
    } else if (tool === 'eraser') {
      canvas.current.freeDrawingBrush.color = '#ffffff';
    }
  }, []);

  const setBrushSize = useCallback((size: number) => {
    if (!canvas.current) return;
    canvas.current.freeDrawingBrush.width = size;
    updateCursor(size);
  }, []);

  const setColor = useCallback((color: string) => {
    currentColorRef.current = color;
    setCurrentColorState(color);
    if (!canvas.current) return;
    if (canvas.current.freeDrawingBrush) {
      canvas.current.freeDrawingBrush.color = color;
    }
  }, []);

  const clearCanvas = useCallback(() => {
    if (!canvas.current) return;
    canvas.current.clear();
    canvas.current.setBackgroundColor('#ffffff');
    canvas.current.renderAll();
  }, []);

  // Page management functions
  const addPage = useCallback(() => {
    const newPageId = uuidv4();
    const newPage: PageInfo = {
      id: newPageId,
      name: `Page ${pages.length + 1}`,
      objects: {}
    };
    setPages(prev => [...prev, newPage]);
    // Switch to the new page
    setCurrentPageIndex(pages.length);
    currentPageIdRef.current = newPageId;
    clearCanvas();
  }, [pages.length, clearCanvas]);

  const switchToPage = useCallback((pageIndex: number) => {
    if (pageIndex < 0 || pageIndex >= pages.length) return;

    // Save current page state
    setPages(prev => {
      const newPages = [...prev];
      const currentPage = newPages[currentPageIndex];
      if (canvas.current) {
        const objects: Record<string, object> = {};
        canvas.current.getObjects().forEach(obj => {
          const customId = (obj as fabric.Object & { customId?: string }).customId;
          if (customId) {
            objects[customId] = obj.toJSON([CUSTOM_ID_KEY]);
          }
        });
        currentPage.objects = objects;
      }
      return newPages;
    });

    // Load new page
    setCurrentPageIndex(pageIndex);
    currentPageIdRef.current = pages[pageIndex].id;
    loadCanvasState(pages[pageIndex].objects);
  }, [pages, currentPageIndex]);

  const deletePage = useCallback((pageIndex: number) => {
    if (pages.length <= 1) return; // Don't delete the last page

    setPages(prev => {
      const newPages = prev.filter((_, i) => i !== pageIndex);
      // Renumber page names
      newPages.forEach((page, i) => {
        page.name = `Page ${i + 1}`;
      });
      return newPages;
    });

    // Adjust current page index if necessary
    if (pageIndex <= currentPageIndex) {
      const newIndex = Math.max(0, currentPageIndex - (pageIndex < currentPageIndex ? 1 : 0));
      setCurrentPageIndex(newIndex);
      currentPageIdRef.current = pages[Math.min(newIndex, pages.length - 2)].id;
      if (newIndex !== currentPageIndex) {
        loadCanvasState(pages[newIndex].objects);
      }
    }
  }, [pages, currentPageIndex]);

  const getCurrentPageId = useCallback(() => currentPageIdRef.current, []);

  // Zaaplikuj obiekt zdalny na canvas
  const applyRemoteObject = useCallback((pageId: string, objectId: string, fabricJSON: object) => {
    if (pageId !== currentPageIdRef.current) return; // Only apply if it's for current page
    if (!canvas.current) return;
    isApplyingRemote.current = true;

    // Usuń stary obiekt o tym samym ID jeśli istnieje
    const existing = canvas.current.getObjects().find(
        (obj) => (obj as fabric.Object & { customId?: string }).customId === objectId
    );
    if (existing) {
      canvas.current.remove(existing);
    }

    fabric.util.enlivenObjects(
        [fabricJSON],
        (objects: fabric.Object[]) => {
          objects.forEach((obj) => {
            (obj as fabric.Object & { customId?: string }).customId = objectId;
            obj.selectable = false;
            obj.evented = false;
            canvas.current?.add(obj);
          });
          canvas.current?.renderAll();
          isApplyingRemote.current = false;
        },
        'fabric'
    );
  }, []);

  const removeRemoteObject = useCallback((pageId: string, objectId: string) => {
    if (pageId !== currentPageIdRef.current) return; // Only remove if it's for current page
    if (!canvas.current) return;
    const obj = canvas.current.getObjects().find(
        (o) => (o as fabric.Object & { customId?: string }).customId === objectId
    );
    if (obj) {
      canvas.current.remove(obj);
      canvas.current.renderAll();
    }
  }, []);

  // Załaduj pełny stan canvas z serwera
  const loadCanvasState = useCallback((canvasState: Record<string, Record<string, object>>) => {
    // canvasState is { pageId: { objectId: fabricObject } }
    // For now, load the first page's objects into the current canvas
    const pageIds = Object.keys(canvasState);
    if (pageIds.length > 0) {
      const firstPageObjects = canvasState[pageIds[0]];
      if (firstPageObjects) {
        isApplyingRemote.current = true;
        canvas.current?.clear();
        canvas.current?.setBackgroundColor('#ffffff');

        const objects = Object.entries(firstPageObjects);
        if (objects.length === 0) {
          canvas.current?.renderAll();
          isApplyingRemote.current = false;
          return;
        }

        const fabricObjects = objects.map(([, obj]) => obj);
        const ids = objects.map(([id]) => id);

        fabric.util.enlivenObjects(
            fabricObjects,
            (enlivened: fabric.Object[]) => {
              enlivened.forEach((obj, i) => {
                (obj as fabric.Object & { customId?: string }).customId = ids[i];
                obj.selectable = false;
                obj.evented = false;
                canvas.current?.add(obj);
              });
              canvas.current?.renderAll();
              isApplyingRemote.current = false;
            },
            'fabric'
        );
      }
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      backgroundColor: '#ffffff',
      selection: false,
      width: A4_WIDTH,
      height: A4_HEIGHT,
    });

    fabricCanvas.freeDrawingBrush.width = 3;
    fabricCanvas.freeDrawingBrush.color = '#000000';
    canvas.current = fabricCanvas;
    updateCursor(3);

    // No resize observer needed since we're using fixed A4 size
    // The canvas will be centered/scaled in the Canvas component

    // Śledzenie ruchu kursora
    fabricCanvas.on('mouse:move', (e) => {
      const pointer = fabricCanvas.getPointer(e.e);
      optionsRef.current.onCursorMove?.(currentPageIdRef.current, pointer.x, pointer.y);
    });

    // Po zakończeniu rysowania ścieżki — wyślij do serwera
    fabricCanvas.on('path:created', (e) => {
      if (isApplyingRemote.current) return;
      const path = e.path as fabric.Path & { customId?: string };
      const objectId = uuidv4();
      path.customId = objectId;
      path.selectable = false;
      path.evented = false;

      const json = path.toJSON([CUSTOM_ID_KEY]);
      optionsRef.current.onObjectAdded?.(currentPageIdRef.current, objectId, json);
    });

    return () => {
      fabricCanvas.dispose();
      canvas.current = null;
    };
  }, []);

  return {
    canvasRef,
    canvas,
    isApplyingRemote,
    setTool,
    setBrushSize,
    setColor,
    currentColor,
    clearCanvas,
    // Page management
    pages,
    currentPageIndex,
    addPage,
    switchToPage,
    deletePage,
    getCurrentPageId,
    // @ts-ignore — eksportujemy pomocnicze metody
    applyRemoteObject,
    removeRemoteObject,
    loadCanvasState,
  };
}
