import { RemoteCursor } from '../../hooks/useSocket';

interface CursorOverlayProps {
    cursors: RemoteCursor[];
}

export function CursorOverlay({ cursors }: CursorOverlayProps) {
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
            {cursors.map((cursor) => (
                <div
                    key={cursor.socketId}
                    style={{
                        position: 'absolute',
                        left: cursor.x,
                        top: cursor.y,
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