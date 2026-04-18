import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

export function Lobby() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [mode, setMode] = useState<'home' | 'join'>('home');
    const [error, setError] = useState('');

    const createBoard = () => {
        if (!username.trim()) {
            setError('Podaj swoje imię');
            return;
        }
        const sessionId = uuidv4();
        navigate(`/board/${sessionId}?username=${encodeURIComponent(username.trim())}`);
    };

    const joinBoard = () => {
        if (!username.trim()) {
            setError('Podaj swoje imię');
            return;
        }
        if (!joinCode.trim()) {
            setError('Podaj kod tablicy');
            return;
        }

        // Wytnij samo ID — obsłuż zarówno pełny URL jak i samo ID
        let sessionId = joinCode.trim();
        try {
            const url = new URL(sessionId);
            // Wklejono pełny URL — wyciągnij ostatni segment ścieżki
            const parts = url.pathname.split('/').filter(Boolean);
            sessionId = parts[parts.length - 1];
        } catch {
            // Nie jest URL-em — traktuj jako samo ID, zostaw bez zmian
        }

        if (!sessionId) {
            setError('Nieprawidłowy link lub kod tablicy');
            return;
        }

        navigate(`/board/${sessionId}?username=${encodeURIComponent(username.trim())}`);
    };

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e40af 100%)',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}>
            <div style={{
                background: 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                padding: '48px',
                width: '420px',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>✏️</div>
                    <h1 style={{
                        fontSize: '2.2rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        margin: 0,
                        letterSpacing: '-1px',
                    }}>Drafty</h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '6px', fontSize: '14px' }}>
                        Wspólna tablica w czasie rzeczywistym
                    </p>
                </div>

                {/* Pole username — zawsze widoczne */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        Twoje imię
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => { setUsername(e.target.value); setError(''); }}
                        placeholder="np. Jan, Pani Kowalska..."
                        maxLength={30}
                        onKeyDown={(e) => e.key === 'Enter' && mode === 'home' && createBoard()}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(255,255,255,0.1)',
                            color: '#ffffff',
                            fontSize: '15px',
                            outline: 'none',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239,68,68,0.2)',
                        border: '1px solid rgba(239,68,68,0.4)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: '#fca5a5',
                        fontSize: '13px',
                        marginBottom: '16px',
                    }}>
                        {error}
                    </div>
                )}

                {mode === 'home' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button
                            onClick={createBoard}
                            style={{
                                padding: '14px',
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                        >
                            🆕 Utwórz nową tablicę
                        </button>

                        <button
                            onClick={() => setMode('join')}
                            style={{
                                padding: '14px',
                                background: 'rgba(255,255,255,0.1)',
                                color: '#ffffff',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                        >
                            🔗 Dołącz do tablicy
                        </button>
                    </div>
                )}

                {mode === 'join' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                Kod tablicy
                            </label>
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => { setJoinCode(e.target.value); setError(''); }}
                                placeholder="Wklej ID tablicy..."
                                onKeyDown={(e) => e.key === 'Enter' && joinBoard()}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'rgba(255,255,255,0.1)',
                                    color: '#ffffff',
                                    fontSize: '13px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'monospace',
                                }}
                            />
                        </div>

                        <button
                            onClick={joinBoard}
                            style={{
                                padding: '14px',
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                            }}
                        >
                            ✅ Dołącz
                        </button>

                        <button
                            onClick={() => { setMode('home'); setError(''); }}
                            style={{
                                padding: '10px',
                                background: 'transparent',
                                color: 'rgba(255,255,255,0.5)',
                                border: 'none',
                                fontSize: '14px',
                                cursor: 'pointer',
                            }}
                        >
                            ← Wróć
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
