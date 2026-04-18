import { Tool } from '../../hooks/useCanvas';

interface ToolbarProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  currentColor: string;
  onColorChange: (color: string) => void;

  onClear: () => void;
  connected: boolean;
  username: string;
}

export function Toolbar({ currentTool, onToolChange, brushSize, onBrushSizeChange, currentColor, onColorChange }: ToolbarProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50px',
        backgroundColor: '#f3f4f6',
        borderBottom: '1px solid #d1d5db',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        zIndex: 10,
      }}
    >
      <button
        onClick={() => onToolChange('pen')}
        style={{
          padding: '8px 16px',
          marginRight: '8px',
          backgroundColor: currentTool === 'pen' ? '#3b82f6' : '#ffffff',
          color: currentTool === 'pen' ? '#ffffff' : '#000000',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        🖊️ Ołówek
      </button>
      <button
        onClick={() => onToolChange('eraser')}
        style={{
          padding: '8px 16px',
          marginRight: '16px',
          backgroundColor: currentTool === 'eraser' ? '#3b82f6' : '#ffffff',
          color: currentTool === 'eraser' ? '#ffffff' : '#000000',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        🧽 Gumka
      </button>
      <label style={{ marginRight: '8px', fontSize: '14px' }}>Rozmiar:</label>
      <input
        type="range"
        min="1"
        max="50"
        value={brushSize}
        onChange={(e) => onBrushSizeChange(Number(e.target.value))}
        style={{ marginRight: '8px' }}
      />
      <span style={{ fontSize: '14px' }}>{brushSize}px</span>
      <div style={{ marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
        <label style={{ marginRight: '8px', fontSize: '14px' }}>Kolor:</label>
        {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: color,
              border: currentColor === color ? '2px solid #000000' : '1px solid #d1d5db',
              borderRadius: '4px',
              marginRight: '4px',
              cursor: 'pointer',
            }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}
