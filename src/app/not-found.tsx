import Link from 'next/link';

export default function NotFound() {
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
            <div style={{
                fontSize: '80px',
                lineHeight: 1,
                marginBottom: '24px',
                opacity: 0.4,
            }}>404</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                페이지를 찾을 수 없어요
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '320px', lineHeight: 1.6 }}>
                요청하신 페이지가 존재하지 않거나 이동되었습니다.
            </div>
            <Link href="/dashboard" className="btn btn-primary">
                대시보드로 돌아가기
            </Link>
        </div>
    );
}
