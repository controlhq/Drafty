import { useState } from 'react';
import { useCanvas, Tool } from '../../hooks/useCanvas';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';

export function Board() {
  const { canvasRef, setTool, setBrushSize } = useCanvas();
  const [currentTool, setCurrentTool] = useState<Tool>('pen');
  const [brushSize, setBrushSizeState] = useState(3);

  const handleToolChange = (tool: Tool) => {
    setCurrentTool(tool);
    setTool(tool);
  };

  const handleBrushSizeChange = (size: number) => {
    setBrushSizeState(size);
    setBrushSize(size);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Toolbar
        currentTool={currentTool}
        onToolChange={handleToolChange}
        brushSize={brushSize}
        onBrushSizeChange={handleBrushSizeChange}
      />
      <Canvas canvasRef={canvasRef} />
    </div>
  );
}
