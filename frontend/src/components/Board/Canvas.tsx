import React from 'react';
import { A4_WIDTH, A4_HEIGHT } from '../../hooks/useCanvas';

interface CanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

// Używamy React.memo, aby zapobiec zbędnym re-renderom przy ruchach myszki/zmianach UI
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
        overflow: 'auto', // Pozwala przewijać, jeśli A4 się nie mieści
        padding: '80px 20px 20px 20px', 
      }}
    >
      <div
        style={{
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          border: '1px solid #d1d5db',
          backgroundColor: '#ffffff',
          lineHeight: 0, // Usuwa dziwne odstępy pod canvasem
        }}
      >
        <canvas
          ref={canvasRef}
          // WAŻNE: Wymiary muszą być stałe, Fabric sam zajmie się resztą
          width={A4_WIDTH}
          height={A4_HEIGHT}
          style={{
            display: 'block',
            // Jeśli chcesz, aby płótno zawsze mieściło się w ekranie:
            maxWidth: '90vw',
            maxHeight: '85vh',
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  );
});

Canvas.displayName = 'Canvas';