'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { loadData } from '@/lib/supabase-storage';
import type { InsightResult, InsightCard } from '@/app/api/gemini/insight/route';

type InsightState = 'idle' | 'loading' | 'done' | 'error';

const TYPE_COLORS: Record<InsightCard['type'], string> = {
    time: '#7c3aed',
    keyword: '#2563eb',
    content: '#e53e3e',
    audience: '#16a34a',
    trend: '#d97706',
};

function InsightCardItem({ card }: { card: InsightCard }) {
    const color = TYPE_COLORS[card.type] ?? 'var(--accent)';
    return (
        <div style={{
            padding: '16px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${color}33`,
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
        }}>
            <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: `${color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0,
            }}>
                {card.icon}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {card.title}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.5 }}>
                    {card.description}
                </div>
                <div style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    background: `${color}15`,
                    color,
                    border: `1px solid ${color}40`,
                }}>
                    → {card.actionable}
                </div>
            </div>
        </div>
    );
}

export default function InsightPage() {
    const [apiKey, setApiKey] = useState('');
    const [state, setState] = useState<InsightState>('idle');
    const [result, setResult] = useState<InsightResult | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [channelName, setChannelName] = useState('');

    useEffect(() => {
        loadData().then((data) => {
        setApiKey(data.geminiApiKey ?? '');

        // BrandKit 우선, 없으면 ChannelInfo 폴백
        const bk = data.brandKit;
        const ch = data.channel;
        const yt = data.youtubeChannels?.[0];
        setChannelName(bk?.channelName || ch?.name || yt?.channelName || '내 채널');
        });
    }, []);

    async function handleAnalyze() {
        if (!apiKey) {
            setErrorMsg('설정 페이지에서 Gemini API 키를 먼저 입력하세요.');
            setState('error');
            return;
        }

        setState('loading');
        setErrorMsg('');
        setResult(null);

        try {
            const data = await loadData();
            const bk = data.brandKit;
            const ch = data.channel;
            const yt = data.youtubeChannels?.[0];

            const payload = {
                apiKey,
                channelName: bk?.channelName || ch?.name || yt?.channelName || '내 채널',
                genre: bk?.primaryGenre || ch?.genre || '미설정',
                targetAudience: bk?.targetAudience || ch?.targetAudience || '미설정',
                uploadFrequency: ch?.uploadFrequency || '미설정',
                moodKeywords: bk?.moodKeywords || [],
                subscriberCount: yt?.subscriberCount ?? 0,
                totalViews: yt?.totalViews ?? 0,
                avgEngagementRate: yt?.avgEngagement ?? 0,
            };

            const res = await fetch('/api/gemini/insight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json() as InsightResult & { error?: string };

            if (!res.ok || json.error) throw new Error(json.error ?? '알 수 없는 오류');

            setResult(json);
            setState('done');
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : '오류가 발생했습니다.');
            setState('error');
        }
    }

    const isLoading = state === 'loading';

    return (
        <div className="page-content">
            <Header
                title="딥 인사이트"
                subtitle="Gemini AI가 분석한 이번 주 트렌드와 콘텐츠 전략"
            />

            {/* 채널 정보 + 분석 버튼 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    분석 채널: <strong style={{ color: 'var(--text-primary)' }}>{channelName}</strong>
                    {result && (
                        <span style={{ marginLeft: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            마지막 분석: {new Date(result.generatedAt).toLocaleString('ko-KR')}
                        </span>
                    )}
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleAnalyze}
                    disabled={isLoading}
                    style={{ minWidth: '140px' }}
                >
                    {isLoading ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="loading-pulse" style={{ width: '14px', height: '14px', borderRadius: '50%', display: 'inline-block' }} />
                            분석 중...
                        </span>
                    ) : result ? '재분석' : 'AI 인사이트 분석'}
                </button>
            </div>

            {/* 에러 */}
            {state === 'error' && (
                <div className="info-banner" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', marginBottom: '24px' }}>
                    {errorMsg}
                </div>
            )}

            {/* 결과 */}
            {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* 이번 주 추천 콘텐츠 방향 */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">이번 주 추천 콘텐츠 방향</span>
                            <span style={{ fontSize: '18px' }}>🧭</span>
                        </div>
                        <div style={{
                            padding: '16px',
                            background: 'linear-gradient(135deg, rgba(229,62,62,0.08), rgba(124,58,237,0.08))',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(229,62,62,0.2)',
                            fontSize: '14.5px',
                            lineHeight: 1.7,
                            color: 'var(--text-primary)',
                            marginTop: '4px',
                        }}>
                            {result.weeklyDirection}
                        </div>
                        <div style={{ marginTop: '12px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                최적 업로드 시간대
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '18px' }}>⏰</span>
                                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    {result.bestUploadTime}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 트렌드 키워드 */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">트렌드 키워드</span>
                            <span style={{ fontSize: '18px' }}>🔥</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
                            {result.trendKeywords.map((kw, i) => (
                                <span key={i} style={{
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    background: i === 0 ? 'rgba(229,62,62,0.15)' : 'var(--bg-secondary)',
                                    color: i === 0 ? 'var(--accent)' : 'var(--text-secondary)',
                                    border: `1px solid ${i === 0 ? 'var(--accent)40' : 'var(--border)'}`,
                                }}>
                                    #{kw}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 인사이트 카드 */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">주간 인사이트</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{result.cards.length}개</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
                            {result.cards.map((card, i) => (
                                <InsightCardItem key={i} card={card} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 초기 안내 */}
            {state === 'idle' && !result && (
                <div className="empty-state">
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📡</div>
                    <p>AI 인사이트 분석 버튼을 눌러 시작하세요.</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        BrandKit, 채널기획, YouTube 통계 데이터를 바탕으로<br />
                        Gemini가 이번 주 최적 콘텐츠 전략을 분석합니다.
                    </p>
                </div>
            )}
        </div>
    );
}
