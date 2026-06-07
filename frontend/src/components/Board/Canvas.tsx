import React from 'react';
import { A4_WIDTH, A4_HEIGHT } from '../../hooks/useCanvas';

interface CanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const Canvas = React.memo(({ canvasRef }: CanvasProps) => {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        overflow: 'auto',
        padding: '80px 20px 20px 20px',
      }}
    >
      <div
        style={{
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          border: '1px solid #d1d5db',
          backgroundColor: '#ffffff',
          lineHeight: 0,
          width: `min(90vw, ${A4_WIDTH}px)`,
          aspectRatio: `${A4_WIDTH} / ${A4_HEIGHT}`,
        }}
      >
        <canvas
          ref={canvasRef}
          width={A4_WIDTH}
          height={A4_HEIGHT}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    </div>
  );
});

Canvas.displayName = 'Canvas';
