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

  // Synchronizacja lokalnego pola tekstowego z danymi strony
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
      {/* SEKCJA: NARZĘDZIA */}
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

      {/* SEKCJA: USTAWIENIA PĘDZLA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '20px' }}>
        <input
          type="range"
          min="1"
          max="40"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          style={{ cursor: 'pointer', width: '80px' }}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          {['#000000', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b'].map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: color,
                border: currentColor === color ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.1)',
                outline: currentColor === color ? '2px solid #3b82f6' : 'none',
                borderRadius: '50%',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      </div>

      {/* SEKCJA: NAWIGACJA STRONAMI (Wyśrodkowana) */}
      <div style={{ marginLeft: 'auto', marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={() => onSwitchToPage(Math.max(0, currentPageIndex - 1))}
          disabled={currentPageIndex === 0}
          style={{
            padding: '4px 8px',
            background: 'none',
            border: 'none',
            cursor: currentPageIndex === 0 ? 'default' : 'pointer',
            opacity: currentPageIndex === 0 ? 0.2 : 0.6,
            fontSize: '18px'
          }}
        >
          ‹
        </button>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          backgroundColor: '#f3f4f6', 
          padding: '4px 10px', 
          borderRadius: '8px',
          gap: '10px'
        }}>
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
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 600,
                width: '100px',
                outline: '2px solid #3b82f6',
              }}
            />
          ) : (
            <span
              onClick={() => setIsEditing(true)}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#1f2937',
                cursor: 'text',
                minWidth: '70px',
                textAlign: 'center',
                userSelect: 'none'
              }}
            >
              {pages[currentPageIndex]?.name}
            </span>
          )}

          {/* Przycisk rozwijanej listy stron (Dropdown) */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '20px' }}>
            <select
              value={currentPageIndex}
              onChange={(e) => onSwitchToPage(Number(e.target.value))}
              style={{
                position: 'absolute',
                opacity: 0,
                width: '100%',
                height: '100%',
                cursor: 'pointer',
                zIndex: 2,
                top: 0,
                left: 0
              }}
            >
              {pages.map((page, index) => (
                <option key={page.id} value={index}>
                  {index + 1}. {page.name}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '10px', color: '#6b7280', zIndex: 1, pointerEvents: 'none' }}>
              ▼
            </span>
          </div>
        </div>

        <button
          onClick={() => onSwitchToPage(Math.min(pages.length - 1, currentPageIndex + 1))}
          disabled={currentPageIndex === pages.length - 1}
          style={{
            padding: '4px 8px',
            background: 'none',
            border: 'none',
            cursor: currentPageIndex === pages.length - 1 ? 'default' : 'pointer',
            opacity: currentPageIndex === pages.length - 1 ? 0.2 : 0.6,
            fontSize: '18px'
          }}
        >
          ›
        </button>

        <button
          onClick={onAddPage}
          style={{
            marginLeft: '6px',
            width: '28px',
            height: '28px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Dodaj nową stronę"
        >
          +
        </button>

        {pages.length > 1 && (
          <button
            onClick={() => onDeletePage(currentPageIndex)}
            style={{
              marginLeft: '4px',
              padding: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              opacity: 0.5
            }}
            title="Usuń stronę"
          >
            🗑️
          </button>
        )}
      </div>

      {/* SEKCJA: STATUS I CZYSZCZENIE */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button
          onClick={onClear}
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            color: '#ef4444',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
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