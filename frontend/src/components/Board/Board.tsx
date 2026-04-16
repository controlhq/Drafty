import { useCanvas } from '../../hooks/useCanvas';
import { Canvas } from './Canvas';

export function Board() {
  const { canvasRef } = useCanvas();

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Canvas canvasRef={canvasRef} />
    </div>
  );
}
