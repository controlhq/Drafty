import { RefObject } from 'react';

interface CanvasProps {
  canvasRef: RefObject<HTMLCanvasElement>;
}

export function Canvas({ canvasRef }: CanvasProps) {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
