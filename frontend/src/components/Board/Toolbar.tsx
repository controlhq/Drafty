import { Tool } from '../../hooks/useCanvas';
import { PageInfo } from '../../types';

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
  // Page management
  pages: PageInfo[];
  currentPageIndex: number;
  onAddPage: () => void;
  onSwitchToPage: (pageIndex: number) => void;
  onDeletePage: (pageIndex: number) => void;
}

export function Toolbar({
  currentTool,
  onToolChange,
  brushSize,
  onBrushSizeChange,
  currentColor,
  onColorChange,
  onClear,
  connected,
  username,
  pages,
  currentPageIndex,
  onAddPage,
  onSwitchToPage,
  onDeletePage
}: ToolbarProps) {
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

      {/* Page controls */}
      <div style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onAddPage}
          style={{
            padding: '8px 12px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          title="Add new page"
        >
          ➕ Page
        </button>

        {/* Page navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => onSwitchToPage(Math.max(0, currentPageIndex - 1))}
            disabled={currentPageIndex === 0}
            style={{
              padding: '6px 8px',
              backgroundColor: currentPageIndex === 0 ? '#f3f4f6' : '#ffffff',
              color: currentPageIndex === 0 ? '#9ca3af' : '#000000',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: currentPageIndex === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
            title="Previous page"
          >
            ←
          </button>

          <span style={{
            padding: '6px 12px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            minWidth: '80px',
            textAlign: 'center',
          }}>
            {pages[currentPageIndex]?.name || 'Page 1'}
          </span>

          <button
            onClick={() => onSwitchToPage(Math.min(pages.length - 1, currentPageIndex + 1))}
            disabled={currentPageIndex === pages.length - 1}
            style={{
              padding: '6px 8px',
              backgroundColor: currentPageIndex === pages.length - 1 ? '#f3f4f6' : '#ffffff',
              color: currentPageIndex === pages.length - 1 ? '#9ca3af' : '#000000',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: currentPageIndex === pages.length - 1 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
            title="Next page"
          >
            →
          </button>
        </div>

        {pages.length > 1 && (
          <button
            onClick={() => onDeletePage(currentPageIndex)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            title="Delete current page"
          >
            🗑️ Delete
          </button>
        )}
      </div>

      {/* Clear button */}
      <button
        onClick={onClear}
        style={{
          marginLeft: '16px',
          padding: '8px 16px',
          backgroundColor: '#ef4444',
          color: '#ffffff',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
        title="Clear current page"
      >
        🗑️ Wyczyść
      </button>

      {/* Connection status */}
      <div style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: connected ? '#10b981' : '#ef4444',
          }}
        />
        <span style={{ fontSize: '14px', color: connected ? '#10b981' : '#ef4444' }}>
          {connected ? 'Połączony' : 'Rozłączony'}
        </span>
        <span style={{ fontSize: '14px', color: '#6b7280' }}>
          {username}
        </span>
      </div>
    </div>
  );
}
