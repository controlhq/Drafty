import { useEffect, useRef, RefObject, MutableRefObject, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { v4 as uuidv4 } from 'uuid';

export type Tool = 'pen' | 'eraser';

export interface UseCanvasReturn {
  canvasRef: RefObject<HTMLCanvasElement>;
  canvas: MutableRefObject<fabric.Canvas | null>;
  isApplyingRemote: MutableRefObject<boolean>;
  setTool: (tool: Tool) => void;
  setBrushSize: (size: number) => void;
  setColor: (color: string) => void;
  currentColor: string;
  clearCanvas: () => void;
}

interface UseCanvasOptions {
  onObjectAdded?: (objectId: string, fabricObject: object) => void;
  onObjectModified?: (objectId: string, fabricObject: object) => void;
  onObjectRemoved?: (objectId: string) => void;
  onCursorMove?: (x: number, y: number) => void;
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
    canvas.current.backgroundColor = '#ffffff';
    canvas.current.renderAll();
  }, []);

  // Zaaplikuj obiekt zdalny na canvas
  const applyRemoteObject = useCallback((objectId: string, fabricJSON: object) => {
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

  const removeRemoteObject = useCallback((objectId: string) => {
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
  const loadCanvasState = useCallback((canvasObjects: Record<string, object>) => {
    if (!canvas.current) return;
    isApplyingRemote.current = true;
    canvas.current.clear();
    canvas.current.backgroundColor = '#ffffff';

    const objects = Object.entries(canvasObjects);
    if (objects.length === 0) {
      canvas.current.renderAll();
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
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      backgroundColor: '#ffffff',
      selection: false,
    });

    fabricCanvas.freeDrawingBrush.width = 3;
    fabricCanvas.freeDrawingBrush.color = '#000000';
    canvas.current = fabricCanvas;
    updateCursor(3);

    // Resize
    const resize = () => {
      fabricCanvas.setWidth(window.innerWidth);
      fabricCanvas.setHeight(window.innerHeight);
      fabricCanvas.renderAll();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(document.documentElement);

    // Śledzenie ruchu kursora
    fabricCanvas.on('mouse:move', (e) => {
      const pointer = fabricCanvas.getPointer(e.e);
      optionsRef.current.onCursorMove?.(pointer.x, pointer.y);
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
      optionsRef.current.onObjectAdded?.(objectId, json);
    });

    return () => {
      observer.disconnect();
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
    // @ts-ignore — eksportujemy pomocnicze metody
    applyRemoteObject,
    removeRemoteObject,
    loadCanvasState,
  };
}
