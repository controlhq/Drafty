import React, { useState, useEffect } from 'react';
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
  // Zarządzanie stronami
  pages: PageInfo[];
  currentPageIndex: number;
  onAddPage: () => void;
  onSwitchToPage: (pageIndex: number) => void;
  onDeletePage: (pageIndex: number) => void;
  onRenamePage: (pageIndex: number, newName: string) => void;
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
  onDeletePage,
  onRenamePage,
}: ToolbarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState('');

  // Synchronizacja lokalnego pola tekstowego z danymi z hooka
  useEffect(() => {
    if (pages[currentPageIndex]) {
      setTempName(pages[currentPageIndex].name);
    }
  }, [currentPageIndex, pages]);

  const handleRenameSubmit = () => {
    const trimmedName = tempName.trim();
    if (trimmedName && trimmedName !== pages[currentPageIndex].name) {
      onRenamePage(currentPageIndex, trimmedName);
    } else {
      // Jeśli nazwa jest pusta, przywróć poprzednią
      setTempName(pages[currentPageIndex].name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    }
    if (e.key === 'Escape') {
      setTempName(pages[currentPageIndex].name);
      setIsEditing(false);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '55px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Narzędzia rysowania */}
      <div style={{ display: 'flex', gap: '4px', marginRight: '20px' }}>
        <button
          onClick={() => onToolChange('pen')}
          style={{
            padding: '8px 12px',
            backgroundColor: currentTool === 'pen' ? '#eff6ff' : 'transparent',
            color: currentTool === 'pen' ? '#2563eb' : '#4b5563',
            border: currentTool === 'pen' ? '1px solid #bfdbfe' : '1px solid transparent',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          🖊️ Pisak
        </button>
        <button
          onClick={() => onToolChange('eraser')}
          style={{
            padding: '8px 12px',
            backgroundColor: currentTool === 'eraser' ? '#eff6ff' : 'transparent',
            color: currentTool === 'eraser' ? '#2563eb' : '#4b5563',
            border: currentTool === 'eraser' ? '1px solid #bfdbfe' : '1px solid transparent',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          🧽 Gumka
        </button>
      </div>

      <div style={{ height: '24px', width: '1px', backgroundColor: '#e5e7eb', marginRight: '20px' }} />

      {/* Rozmiar pędzla */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '20px' }}>
        <input
          type="range"
          min="1"
          max="40"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          style={{ cursor: 'pointer', width: '100px' }}
        />
        <span style={{ fontSize: '13px', color: '#6b7280', width: '30px' }}>{brushSize}px</span>
      </div>

      {/* Kolory */}
      <div style={{ display: 'flex', gap: '6px', marginRight: '20px' }}>
        {['#000000', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b'].map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            style={{
              width: '22px',
              height: '22px',
              backgroundColor: color,
              border: currentColor === color ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.1)',
              outline: currentColor === color ? '2px solid #3b82f6' : 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              transition: 'transform 0.1s',
            }}
          />
        ))}
      </div>

      {/* Zarządzanie stronami - Wyśrodkowane */}
      <div style={{ marginLeft: 'auto', marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => onSwitchToPage(Math.max(0, currentPageIndex - 1))}
          disabled={currentPageIndex === 0}
          style={{
            padding: '5px 10px',
            background: 'none',
            border: 'none',
            cursor: currentPageIndex === 0 ? 'default' : 'pointer',
            opacity: currentPageIndex === 0 ? 0.2 : 0.6,
            fontSize: '18px',
          }}
        >
          ‹
        </button>

        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: '#f3f4f6', 
            padding: '4px 4px 4px 12px', 
            borderRadius: '8px',
            minWidth: '140px',
            justifyContent: 'space-between'
          }}
        >
          {isEditing ? (
            <input
              autoFocus
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              style={{
                border: 'none',
                background: '#ffffff',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 600,
                width: '100px',
                outline: '2px solid #3b82f6',
              }}
            />
          ) : (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#1f2937',
                cursor: 'pointer',
                flexGrow: 1,
                textAlign: 'center',
                marginRight: '8px'
              }}
            >
              {pages[currentPageIndex]?.name || 'Strona'}
            </span>
          )}
          
          {pages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeletePage(currentPageIndex);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: '4px 8px',
                fontSize: '12px',
              }}
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={() => onSwitchToPage(Math.min(pages.length - 1, currentPageIndex + 1))}
          disabled={currentPageIndex === pages.length - 1}
          style={{
            padding: '5px 10px',
            background: 'none',
            border: 'none',
            cursor: currentPageIndex === pages.length - 1 ? 'default' : 'pointer',
            opacity: currentPageIndex === pages.length - 1 ? 0.2 : 0.6,
            fontSize: '18px',
          }}
        >
          ›
        </button>

        <button
          onClick={onAddPage}
          style={{
            padding: '6px 12px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          + Nowa
        </button>
      </div>

      {/* Prawa strona: Czyszczenie i Status */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button
          onClick={onClear}
          style={{
            padding: '8px 14px',
            backgroundColor: 'transparent',
            color: '#ef4444',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Wyczyść
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #e5e7eb', paddingLeft: '15px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connected ? '#10b981' : '#ef4444',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>{username}</span>
        </div>
      </div>
    </div>
  );
}