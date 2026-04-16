import { useEffect, useRef, RefObject, MutableRefObject } from 'react';
import { fabric } from 'fabric';

export interface UseCanvasReturn {
  canvasRef: RefObject<HTMLCanvasElement>;
  canvas: MutableRefObject<fabric.Canvas | null>;
  isApplyingRemote: MutableRefObject<boolean>;
}

export function useCanvas(): UseCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<fabric.Canvas | null>(null);
  const isApplyingRemote = useRef(false);

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

  return { canvasRef, canvas, isApplyingRemote };
}
