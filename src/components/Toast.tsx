'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
};

const COLORS: Record<ToastType, string> = {
    success: '#22c55e',
    error: 'var(--accent)',
    warning: '#fbbf24',
    info: '#60a5fa',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const t = timers.current.get(id);
        if (t) { clearTimeout(t); timers.current.delete(id); }
    }, []);

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).slice(2);
        setToasts((prev) => [...prev, { id, message, type }]);
        const timer = setTimeout(() => dismiss(id), 3000);
        timers.current.set(id, timer);
    }, [dismiss]);

    // 언마운트 시 타이머 정리
    useEffect(() => {
        const t = timers.current;
        return () => { t.forEach(clearTimeout); };
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 9999,
                pointerEvents: 'none',
            }}>
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            background: 'var(--bg-card)',
                            border: `1px solid ${COLORS[t.type]}`,
                            boxShadow: `0 4px 20px rgba(0,0,0,0.5)`,
                            minWidth: '240px',
                            maxWidth: '360px',
                            pointerEvents: 'auto',
                            animation: 'toast-in 0.2s ease',
                        }}
                    >
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>{ICONS[t.type]}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1, lineHeight: 1.5 }}>
                            {t.message}
                        </span>
                        <button
                            onClick={() => dismiss(t.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: '0',
                                flexShrink: 0,
                            }}
                        >✕</button>
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes toast-in {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used inside ToastProvider');
    return ctx;
}
