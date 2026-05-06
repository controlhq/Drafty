import { RefObject } from 'react';
import { A4_WIDTH, A4_HEIGHT } from '../../hooks/useCanvas';

interface CanvasProps {
  canvasRef: RefObject<HTMLCanvasElement>;
}

export function Canvas({ canvasRef }: CanvasProps) {
  // Calculate scale to fit A4 in viewport while maintaining aspect ratio
  const scale = Math.min(
    (window.innerWidth * 0.8) / A4_WIDTH,
    (window.innerHeight * 0.8) / A4_HEIGHT
  );

  const scaledWidth = A4_WIDTH * scale;
  const scaledHeight = A4_HEIGHT * scale;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        paddingTop: '50px', // Account for toolbar
      }}
    >
      <div
        style={{
          width: scaledWidth,
          height: scaledHeight,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: '1px solid #e0e0e0',
          backgroundColor: '#ffffff',
          position: 'relative',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
}
