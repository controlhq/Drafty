import { RemoteCursor } from '../../hooks/useSocket';
import { A4_WIDTH, A4_HEIGHT } from '../../hooks/useCanvas';

interface CursorOverlayProps {
    cursors: RemoteCursor[];
    currentPageId: string;
}

export function CursorOverlay({ cursors, currentPageId }: CursorOverlayProps) {
    // Calculate scale to fit A4 in viewport while maintaining aspect ratio
    const scale = Math.min(
        (window.innerWidth * 0.8) / A4_WIDTH,
        (window.innerHeight * 0.8) / A4_HEIGHT
    );

    const scaledWidth = A4_WIDTH * scale;
    const scaledHeight = A4_HEIGHT * scale;
    const offsetX = (window.innerWidth - scaledWidth) / 2;
    const offsetY = (window.innerHeight - scaledHeight) / 2 + 50; // Account for toolbar

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 50,
        }}>
            {cursors
                .filter(cursor => cursor.pageId === currentPageId)
                .map((cursor) => (
                <div
                    key={cursor.socketId}
                    style={{
                        position: 'absolute',
                        left: offsetX + cursor.x * scale,
                        top: offsetY + cursor.y * scale,
                        transform: 'translate(-2px, -2px)',
                        pointerEvents: 'none',
                        transition: 'left 0.05s linear, top 0.05s linear',
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path
                            d="M2 2L12 17L14.5 11.5L20 9L2 2Z"
                            fill={cursor.cursorColor}
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <div style={{
                        position: 'absolute',
                        top: '18px',
                        left: '12px',
                        background: cursor.cursorColor,
                        color: '#ffffff',
                        padding: '2px 8px',
                        borderRadius: '100px',
                        fontSize: '11px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}>
                        {cursor.username}
                    </div>
                </div>
            ))}
        </div>
    );
}