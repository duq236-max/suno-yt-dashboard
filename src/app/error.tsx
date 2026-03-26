'use client';

import { useEffect } from 'react';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
    useEffect(() => {
        // 에러 로깅 (프로덕션에서 Sentry 등 연동 가능)
        // eslint-disable-next-line no-console
        console.error(error);
    }, [error]);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
        }}>
            <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.5 }}>⚠️</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                오류가 발생했습니다
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', maxWidth: '360px', lineHeight: 1.6 }}>
                {error.message || '알 수 없는 오류입니다. 잠시 후 다시 시도해주세요.'}
            </div>
            {error.digest && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '28px', opacity: 0.6 }}>
                    오류 코드: {error.digest}
                </div>
            )}
            {!error.digest && <div style={{ marginBottom: '28px' }} />}
            <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={reset}>
                    다시 시도
                </button>
                <a href="/dashboard" className="btn btn-ghost">
                    대시보드로 이동
                </a>
            </div>
        </div>
    );
}
