import { useState } from 'react';

interface SharePanelProps {
    sessionId: string;
}

export function SharePanel({ sessionId }: SharePanelProps) {
    const [copied, setCopied] = useState(false);
    const [open, setOpen] = useState(false);
    const shareUrl = `${window.location.origin}/board/${sessionId}`;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch {
            const el = document.createElement('textarea');
            el.value = shareUrl;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 100 }}>
            {open && (
                <div style={{
                    position: 'absolute', bottom: '56px', right: 0,
                    background: 'white', borderRadius: '14px', padding: '16px',
                    border: '1px solid #e5e7eb', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', width: '280px',
                }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>🔗 Zaproś do tablicy</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '10px' }}>Udostępnij ten link innym osobom:</div>
                    <div style={{
                        background: '#f9fafb', borderRadius: '8px', padding: '8px 10px',
                        fontSize: '11px', fontFamily: 'monospace', color: '#374151',
                        wordBreak: 'break-all', marginBottom: '10px', border: '1px solid #e5e7eb',
                    }}>
                        {shareUrl}
                    </div>
                    <button onClick={copyLink} style={{
                        width: '100%', padding: '10px',
                        background: copied ? '#22c55e' : '#6366f1',
                        color: 'white', border: 'none', borderRadius: '8px',
                        fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s',
                    }}>
                        {copied ? '✓ Skopiowano!' : 'Kopiuj link'}
                    </button>
                </div>
            )}
            <button onClick={() => setOpen((v) => !v)} style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: 'white', border: 'none', fontSize: '20px', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(99,102,241,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                🔗
            </button>
        </div>
    );
}