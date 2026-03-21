'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { loadData, updateGeminiApiKey, clearAllUserData } from '@/lib/supabase-storage';
import { pingExtension, type PingResult } from '@/lib/ping-test';

type Theme = 'dark' | 'light';
type ExtConnStatus = 'detecting' | 'connected' | 'disconnected';

function applyTheme(theme: Theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

export default function SettingsPage() {
    const [cleared, setCleared] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [apiKeySaved, setApiKeySaved] = useState(false);
    const [theme, setTheme] = useState<Theme>(() => (typeof window !== 'undefined' ? (localStorage.getItem('theme') ?? 'dark') : 'dark') as Theme);
    const [extStatus, setExtStatus] = useState<ExtConnStatus>('detecting');
    const [extLatency, setExtLatency] = useState<number | null>(null);

    // 마운트 시 초기 테마 적용 (setState 없음 — DOM 조작만)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { applyTheme(theme); }, []);

    // 마운트 시 API 키 로드
    useEffect(() => {
        const fetchApiKey = async () => {
            const data = await loadData();
            setApiKey(data.geminiApiKey ?? '');
        };
        fetchApiKey();
    }, []);

    // 마운트 시 Extension 연결 감지
    useEffect(() => {
        detectExtension();
    }, []);

    async function detectExtension() {
        setExtStatus('detecting');
        setExtLatency(null);
        const result: PingResult = await pingExtension(1200);
        if (result.connected) {
            setExtStatus('connected');
            setExtLatency(result.latencyMs);
        } else {
            setExtStatus('disconnected');
        }
    }

    function toggleTheme() {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('theme', next);
        applyTheme(next);
    }

    async function clearAll() {
        if (!confirm('모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
        await clearAllUserData();             // Supabase 삭제
        localStorage.removeItem('suno-yt-data');  // localStorage도 정리
        setCleared(true);
        setTimeout(() => window.location.href = '/dashboard', 1500);
    }

    async function saveApiKey() {
        try {
            await updateGeminiApiKey(apiKey.trim());
            setApiKeySaved(true);
            setTimeout(() => setApiKeySaved(false), 2500);
        } catch {
            alert('API 키 저장 실패. 다시 시도해주세요.');
        }
    }

    return (
        <>
            <Header title="계정 설정" />
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <div className="page-title">⚙️ 계정 설정</div>
                        <div className="page-subtitle">앱 데이터 및 환경 설정을 관리하세요</div>
                    </div>
                </div>

                <div style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* ─── 테마 설정 ─── */}
                    <div className="card">
                        <div className="card-title" style={{ marginBottom: '12px' }}>🎨 화면 테마</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    {theme === 'dark' ? '🌙 다크 모드' : '☀️ 라이트 모드'}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                                    현재 테마: {theme === 'dark' ? '어두운 배경' : '밝은 배경'}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={toggleTheme}
                                style={{
                                    width: '52px',
                                    height: '28px',
                                    borderRadius: '14px',
                                    background: theme === 'light' ? 'var(--accent)' : 'var(--border)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transition: 'background 0.25s ease',
                                    flexShrink: 0,
                                }}
                                aria-label="테마 전환"
                            >
                                <span style={{
                                    position: 'absolute',
                                    top: '3px',
                                    left: theme === 'light' ? '27px' : '3px',
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    background: '#fff',
                                    transition: 'left 0.25s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                }}>
                                    {theme === 'dark' ? '🌙' : '☀️'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* ─── Extension 연결 상태 ─── */}
                    <div className="card" style={{ borderColor: extStatus === 'connected' ? 'rgba(34,197,94,0.3)' : extStatus === 'disconnected' ? 'rgba(229,62,62,0.2)' : 'var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div className="card-title" style={{ color: extStatus === 'connected' ? '#22c55e' : extStatus === 'disconnected' ? 'var(--accent)' : 'var(--text-muted)' }}>
                                🔌 Extension 연결 상태
                            </div>
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={detectExtension}
                                disabled={extStatus === 'detecting'}
                                style={{ fontSize: '11px' }}
                            >
                                {extStatus === 'detecting' ? '감지 중…' : '↻ 재감지'}
                            </button>
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 14px', borderRadius: '8px',
                            background: extStatus === 'connected' ? 'rgba(34,197,94,0.06)' : extStatus === 'disconnected' ? 'rgba(229,62,62,0.06)' : 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                        }}>
                            <span style={{ fontSize: '18px' }}>
                                {extStatus === 'detecting' ? '⏳' : extStatus === 'connected' ? '✅' : '❌'}
                            </span>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: extStatus === 'connected' ? '#22c55e' : extStatus === 'disconnected' ? 'var(--accent)' : 'var(--text-muted)' }}>
                                    {extStatus === 'detecting' && 'Extension 감지 중…'}
                                    {extStatus === 'connected' && `연결됨${extLatency !== null ? ` (${extLatency}ms)` : ''}`}
                                    {extStatus === 'disconnected' && 'Extension 미설치 또는 비활성화'}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {extStatus === 'connected' && 'suno-batch-extension 이 대시보드와 정상 통신 중입니다'}
                                    {extStatus === 'disconnected' && 'suno-batch-extension/dist 폴더를 chrome://extensions 에서 로드하세요'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Gemini API 키 ─── */}
                    <div className="card" style={{ borderColor: 'rgba(99, 102, 241, 0.25)', background: 'rgba(99, 102, 241, 0.04)' }}>
                        <div className="card-title" style={{ marginBottom: '8px', color: '#818cf8' }}>🤖 Gemini API 키</div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.7 }}>
                            AI 프롬프트 자동 생성에 사용됩니다.{' '}
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                                style={{ color: '#818cf8', textDecoration: 'none' }}>
                                aistudio.google.com ↗
                            </a>
                            {' '}에서 무료로 발급받으세요.
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="AIza..."
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={saveApiKey}
                                style={{
                                    background: apiKeySaved ? '#22c55e' : undefined,
                                    transition: 'background 0.3s',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {apiKeySaved ? '✅ 저장됨' : '저장'}
                            </button>
                        </div>
                        <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            🆓 Flash (gemini-1.5-flash) — 무료 · 분당 15회 / 일 1,500회<br />
                            🔥 Pro (gemini-1.5-pro) — 유료 · 더 정교하고 창의적
                        </div>
                    </div>

                    {/* 앱 정보 */}
                    <div className="card">
                        <div className="card-title" style={{ marginBottom: '14px' }}>📱 앱 정보</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {[
                                { label: '버전', value: 'v2.0.0 (Phase 2)' },
                                { label: '저장 방식', value: 'Supabase (클라우드 DB)' },
                                { label: '데이터 위치', value: '이 브라우저에만 저장됩니다' },
                            ].map((row) => (
                                <div key={row.label} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 14px', background: 'var(--bg-secondary)',
                                    borderRadius: '8px', border: '1px solid var(--border)',
                                }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{row.label}</span>
                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{row.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 빠른 이동 */}
                    <div className="card">
                        <div className="card-title" style={{ marginBottom: '14px' }}>🔗 빠른 이동</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                { href: 'https://suno.com', label: '🎵 Suno AI 열기', external: true },
                                { href: 'https://studio.youtube.com', label: '📹 YouTube Studio 열기', external: true },
                                { href: 'https://aistudio.google.com/app/apikey', label: '🔑 Gemini API 키 발급', external: true },
                                { href: '/planner', label: '💡 채널기획 수정', external: false },
                                { href: '/scrapsheet', label: '✂️ 스크랩시트로 이동', external: false },
                            ].map((item) => (
                                item.external ? (
                                    <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer"
                                        className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                                        {item.label} ↗
                                    </a>
                                ) : (
                                    <Link key={item.label} href={item.href} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                                        {item.label}
                                    </Link>
                                )
                            ))}
                        </div>
                    </div>

                    {/* 추후 예정 */}
                    <div className="card" style={{ borderColor: 'rgba(251, 191, 36, 0.2)', background: 'rgba(251, 191, 36, 0.03)' }}>
                        <div className="card-title" style={{ marginBottom: '14px', color: '#fbbf24' }}>🚧 추후 예정 (Phase 3~4)</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                '🤖 Chrome 익스텐션 — Suno AI 자동 주입 (B안)',
                                '📡 YouTube OAuth 실제 연동 — 실시간 통계 자동 수집',
                                '💾 데이터 백업/복원 (JSON 내보내기)',
                                '🎬 영상 제목/설명 자동 생성',
                            ].map((f) => (
                                <div key={f} style={{
                                    padding: '10px 14px', background: 'var(--bg-secondary)',
                                    borderRadius: '8px', fontSize: '13px', color: 'var(--text-muted)',
                                    border: '1px solid var(--border)',
                                }}>{f}</div>
                            ))}
                        </div>
                    </div>

                    {/* 위험 구역 */}
                    <div className="card" style={{ borderColor: 'rgba(229, 62, 62, 0.2)' }}>
                        <div className="card-title" style={{ marginBottom: '8px', color: 'var(--accent)' }}>⚠️ 위험 구역</div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.6 }}>
                            모든 데이터(채널기획, 스크랩시트, 유튜브 채널, 스케쥴)를 초기화합니다. 되돌릴 수 없습니다.
                        </p>
                        <button className="btn btn-danger" onClick={() => void clearAll()} disabled={cleared}>
                            {cleared ? '✅ 초기화 완료, 이동 중...' : '🗑️ 전체 데이터 초기화'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
