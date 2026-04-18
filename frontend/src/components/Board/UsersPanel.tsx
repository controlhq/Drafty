import { UserInfo } from '../../hooks/useSocket';

interface UsersPanelProps {
    users: UserInfo[];
    currentUsername: string;
}

export function UsersPanel({ users, currentUsername }: UsersPanelProps) {
    return (
        <div style={{
            position: 'fixed',
            top: '62px',
            right: '16px',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            padding: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            zIndex: 100,
            minWidth: '160px',
        }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
                Na tablicy ({users.length})
            </div>
            {users.map((user) => (
                <div key={user.socketId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                    <div style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: user.cursorColor, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '13px', color: '#374151', fontWeight: user.username === currentUsername ? 700 : 400 }}>
            {user.username}
                        {user.username === currentUsername && <span style={{ color: '#9ca3af', fontWeight: 400 }}> (ty)</span>}
          </span>
                </div>
            ))}
        </div>
    );
}