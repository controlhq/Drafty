import { useEffect, useRef, RefObject, MutableRefObject, useState } from 'react';
import { fabric } from 'fabric';

export type Tool = 'pen' | 'eraser';

export interface UseCanvasReturn {
  canvasRef: RefObject<HTMLCanvasElement>;
  canvas: MutableRefObject<fabric.Canvas | null>;
  isApplyingRemote: MutableRefObject<boolean>;
  setTool: (tool: Tool) => void;
  setBrushSize: (size: number) => void;
  setColor: (color: string) => void;
  currentColor: string;
}

export function useCanvas(): UseCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<fabric.Canvas | null>(null);
  const isApplyingRemote = useRef(false);
  const [currentColor, setCurrentColorState] = useState('#000000');

  const updateCursor = (size: number) => {
    if (!canvas.current) return;
    const cursorSize = Math.max(size, 5); // minimalny rozmiar dla widoczności
    const svg = `
      <svg width="${cursorSize}" height="${cursorSize}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${cursorSize/2}" cy="${cursorSize/2}" r="${size/2}" fill="none" stroke="black" stroke-width="1"/>
      </svg>
    `;
    const encoded = btoa(svg);
    canvas.current.defaultCursor = `url(data:image/svg+xml;base64,${encoded}) ${cursorSize/2} ${cursorSize/2}, crosshair`;
  };

  const setTool = (tool: Tool) => {
    if (!canvas.current) return;
    if (tool === 'pen') {
      canvas.current.freeDrawingBrush.color = currentColor;
    } else if (tool === 'eraser') {
      canvas.current.freeDrawingBrush.color = '#ffffff';
    }
  };

  const setBrushSize = (size: number) => {
    if (!canvas.current) return;
    canvas.current.freeDrawingBrush.width = size;
    updateCursor(size);
  };

  const setColor = (color: string) => {
    setCurrentColorState(color);
    if (!canvas.current) return;
    if (canvas.current.freeDrawingBrush) {
      canvas.current.freeDrawingBrush.color = color;
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      backgroundColor: '#ffffff',
      selection: true,
    });

    fabricCanvas.freeDrawingBrush.width = 3;
    fabricCanvas.freeDrawingBrush.color = '#000000';

    canvas.current = fabricCanvas;

    updateCursor(3);

    const resize = () => {
      fabricCanvas.setWidth(window.innerWidth);
      fabricCanvas.setHeight(window.innerHeight);
      fabricCanvas.renderAll();
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(document.documentElement);

    return () => {
      observer.disconnect();
      fabricCanvas.dispose();
      canvas.current = null;
    };
  }, []);

  return { canvasRef, canvas, isApplyingRemote, setTool, setBrushSize, setColor, currentColor };
}
