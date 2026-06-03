import { UserInfo } from '../../hooks/useSocket';

interface UsersPanelProps {
    users: UserInfo[];
    currentUsername: string;
    hiddenAuthors: Set<string>;
    onToggleVisibility: (socketId: string, visible: boolean) => void;
}

export function UsersPanel({ users, currentUsername, hiddenAuthors, onToggleVisibility }: UsersPanelProps) {
    return (
        <div style={{
            position: 'fixed',
            top: '62px',
            right: '16px',
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            padding: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            zIndex: 100,
            minWidth: '190px',
        }}>
            <div style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#9ca3af',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginBottom: '10px',
            }}>
                Na tablicy ({users.length})
            </div>

            {users.map((user) => {
                const isMe = user.username === currentUsername;
                const isHidden = hiddenAuthors.has(user.authorId);

                return (
                    <div
                        key={user.socketId}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '5px 4px',
                            borderRadius: '8px',
                            transition: 'background 0.15s',
                        }}
                    >
                        {/* Kolorowy wskaźnik */}
                        <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: user.cursorColor,
                            flexShrink: 0,
                            opacity: isHidden ? 0.3 : 1,
                            transition: 'opacity 0.2s',
                        }} />

                        {/* Nazwa */}
                        <span style={{
                            fontSize: '13px',
                            color: isHidden ? '#9ca3af' : '#374151',
                            fontWeight: isMe ? 700 : 400,
                            flex: 1,
                            textDecoration: isHidden ? 'line-through' : 'none',
                            transition: 'color 0.2s',
                        }}>
                            {user.username}
                            {isMe && (
                                <span style={{ color: '#9ca3af', fontWeight: 400 }}> (ty)</span>
                            )}
                        </span>

                        {/* Przycisk widoczności — tylko dla innych użytkowników */}
                        {!isMe && (
                            <button
                                onClick={() => onToggleVisibility(user.authorId, isHidden)}
                                title={isHidden ? `Pokaż rysunki użytkownika ${user.username}` : `Ukryj rysunki użytkownika ${user.username}`}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '2px 4px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    borderRadius: '4px',
                                    opacity: isHidden ? 1 : 0.5,
                                    transition: 'opacity 0.2s, background 0.15s',
                                    lineHeight: 1,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                    e.currentTarget.style.background = '#f3f4f6';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = isHidden ? '1' : '0.5';
                                    e.currentTarget.style.background = 'none';
                                }}
                            >
                                {isHidden ? '🙈' : '👁️'}
                            </button>
                        )}
                    </div>
                );
            })}

            {/* Legenda */}
            {users.some(u => u.username !== currentUsername) && (
                <div style={{
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid #f3f4f6',
                    fontSize: '10px',
                    color: '#d1d5db',
                    lineHeight: 1.4,
                }}>
                    👁️ pokaż / 🙈 ukryj rysunki
                    <br />
                    (tylko lokalnie i w eksporcie)
                </div>
            )}
        </div>
    );
}
