import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

export function Lobby() {
  const navigate = useNavigate();

  const createSession = () => {
    navigate(`/board/${uuidv4()}`);
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        background: '#f9fafb',
      }}
    >
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>Drafty</h1>
      <p style={{ color: '#6b7280' }}>Collaborative whiteboard</p>
      <button
        onClick={createSession}
        style={{
          marginTop: '8px',
          padding: '12px 28px',
          background: '#3b82f6',
          color: '#ffffff',
          border: 'none',
          borderRadius: '10px',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        New board
      </button>
    </div>
  );
}
