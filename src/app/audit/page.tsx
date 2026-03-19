'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { loadData } from '@/lib/storage';
import type { AuditResult, AuditSuggestion } from '@/app/api/gemini/audit/route';
import type { BrandKit, ScrapSheet } from '@/types';

type AuditState = 'idle' | 'loading' | 'done' | 'error';

interface LocalChannelStats {
    channelName: string;
    subscriberCount: number;
    totalViews: number;
    videoCount: number;
    avgEngagementRate: number;
}

interface CategoryScore {
    label: string;
    score: number;
    max: number;
    tip: string;
}

interface VMatchResult {
    score: number;
    topGenres: { genre: string; count: number; isMatch: boolean }[];
    recommendation: string;
}

// ─── Score helpers ───────────────────────────────────────────

function getScoreColor(score: number): string {
    if (score >= 71) return '#48bb78';
    if (score >= 41) return '#ecc94b';
    return '#fc5050';
}

function getGradeColor(grade: string): string {
    if (grade.startsWith('A')) return '#48bb78';
    if (grade.startsWith('B')) return '#ecc94b';
    return '#fc5050';
}

function getPriorityLabel(priority: AuditSuggestion['priority']): string {
    if (priority === 'high') return '🔴 높음';
    if (priority === 'medium') return '🟡 중간';
    return '🟢 낮음';
}

function calcLocalScores(
    stats: LocalChannelStats | null,
    brandKit: BrandKit | null,
    sheets: ScrapSheet[],
): CategoryScore[] {
    // 구독자수 (20점)
    const sub = stats?.subscriberCount ?? 0;
    const subScore = sub >= 200000 ? 20 : sub >= 50000 ? 16 : sub >= 10000 ? 12 : sub >= 1000 ? 8 : sub > 0 ? 4 : 2;

    // 업로드주기 (20점) — videoCount를 활동량 대리 지표로 사용
    const vc = stats?.videoCount ?? 0;
    const uploadScore = vc >= 60 ? 20 : vc >= 30 ? 16 : vc >= 10 ? 12 : vc >= 3 ? 8 : vc > 0 ? 4 : 2;

    // 썸네일일관성 (20점) — BrandKit 완성도 기반
    let thumbScore = 6;
    if (brandKit) {
        const kwLen = brandKit.moodKeywords?.length ?? 0;
        if (brandKit.primaryGenre && kwLen >= 4 && brandKit.tagline) thumbScore = 20;
        else if (brandKit.primaryGenre && kwLen >= 2) thumbScore = 15;
        else thumbScore = 10;
    }

    // 장르일관성 (20점) — 시트 장르 vs BrandKit 주력 장르 매칭율
    let genreScore = 8;
    if (brandKit && sheets.length > 0) {
        const targets = [brandKit.primaryGenre, ...(brandKit.subGenres ?? [])].map(g => g.toLowerCase());
        const matching = sheets.filter(s =>
            s.genre && targets.some(t =>
                s.genre!.toLowerCase().includes(t) || t.includes(s.genre!.toLowerCase())
            )
        ).length;
        const ratio = matching / sheets.length;
        genreScore = ratio >= 0.8 ? 20 : ratio >= 0.5 ? 15 : ratio >= 0.2 ? 10 : 6;
    }

    // 조회율 (20점) — avgEngagementRate
    const eng = stats?.avgEngagementRate ?? 0;
    const engScore = eng >= 4 ? 20 : eng >= 2 ? 15 : eng >= 1 ? 10 : eng > 0 ? 6 : 2;

    return [
        { label: '구독자수', score: subScore, max: 20, tip: '구독자 1만명 이상이면 광고·협찬 기회가 열립니다.' },
        { label: '업로드주기', score: uploadScore, max: 20, tip: '영상 30개 이상 업로드 시 알고리즘 노출이 크게 증가합니다.' },
        { label: '썸네일일관성', score: thumbScore, max: 20, tip: '브랜드킷 분위기 키워드를 4개 이상 설정해 통일감을 높이세요.' },
        { label: '장르일관성', score: genreScore, max: 20, tip: '스크랩시트 장르의 80% 이상이 주력 장르와 일치하면 채널 정체성이 강해집니다.' },
        { label: '조회율', score: engScore, max: 20, tip: '평균 참여율 4% 이상 달성 시 알고리즘 추천 빈도가 높아집니다.' },
    ];
}

function calcVMatch(brandKit: BrandKit | null, sheets: ScrapSheet[]): VMatchResult {
    if (!brandKit) {
        return { score: 0, topGenres: [], recommendation: '브랜드킷을 먼저 설정하세요.' };
    }
    if (sheets.length === 0) {
        return { score: 50, topGenres: [], recommendation: '스크랩시트에 콘텐츠를 추가하면 V-매칭 분석이 가능합니다.' };
    }

    const targets = [brandKit.primaryGenre, ...(brandKit.subGenres ?? [])].map(g => g.toLowerCase());

    const genreMap: Record<string, number> = {};
    sheets.forEach(s => {
        if (s.genre) genreMap[s.genre] = (genreMap[s.genre] ?? 0) + 1;
    });

    const topGenres = Object.entries(genreMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([genre, count]) => ({
            genre,
            count,
            isMatch: targets.some(t =>
                genre.toLowerCase().includes(t) || t.includes(genre.toLowerCase())
            ),
        }));

    const matching = sheets.filter(s =>
        s.genre && targets.some(t =>
            s.genre!.toLowerCase().includes(t) || t.includes(s.genre!.toLowerCase())
        )
    ).length;
    const score = Math.round((matching / sheets.length) * 100);

    const hasUnmatched = topGenres.some(g => !g.isMatch);
    const recommendation = score >= 80
        ? `"${brandKit.primaryGenre}" 장르 일관성이 잘 유지되고 있어요!`
        : hasUnmatched
            ? `"${brandKit.primaryGenre}" 장르 콘텐츠를 더 만들어보세요!`
            : `주력 장르 비중을 80% 이상으로 유지해보세요.`;

    return { score, topGenres, recommendation };
}

// ─── Sub-components ──────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
    const color = getScoreColor(score);
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--border)" strokeWidth="12" />
                <circle
                    cx="70" cy="70" r={radius}
                    fill="none" stroke={color} strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 70 70)"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
                <text x="70" y="65" textAnchor="middle" fill="var(--text-primary)" fontSize="26" fontWeight="700">
                    {score}
                </text>
                <text x="70" y="85" textAnchor="middle" fill="var(--text-muted)" fontSize="12">
                    / 100
                </text>
            </svg>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────

export default function AuditPage() {
    const [apiKey, setApiKey] = useState('');
    const [channelStats, setChannelStats] = useState<LocalChannelStats | null>(null);
    const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
    const [sheets, setSheets] = useState<ScrapSheet[]>([]);
    const [auditState, setAuditState] = useState<AuditState>('idle');
    const [result, setResult] = useState<AuditResult | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const data = loadData();
        setApiKey(data.geminiApiKey ?? '');
        setBrandKit(data.brandKit);
        setSheets(data.sheets);

        const ch = data.youtubeChannels?.[0];
        if (ch) {
            const totalLikes = ch.totalLikes ?? 0;
            const totalComments = ch.totalComments ?? 0;
            const totalViews = ch.totalViews ?? 0;
            const avgEngagement = ch.avgEngagement ?? (
                totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0
            );
            setChannelStats({
                channelName: ch.channelName,
                subscriberCount: ch.subscriberCount ?? 0,
                totalViews,
                videoCount: ch.videoCount ?? 0,
                avgEngagementRate: avgEngagement,
            });
        }
    }, []);

    async function handleAudit() {
        if (!apiKey) { setErrorMsg('설정 페이지에서 Gemini API 키를 먼저 입력하세요.'); setAuditState('error'); return; }
        if (!channelStats) { setErrorMsg('대시보드에서 YouTube 채널을 먼저 추가해주세요.'); setAuditState('error'); return; }

        setAuditState('loading');
        setErrorMsg('');
        setResult(null);

        try {
            const res = await fetch('/api/gemini/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, ...channelStats }),
            });
            const json = await res.json() as AuditResult & { error?: string };
            if (!res.ok || json.error) throw new Error(json.error ?? '알 수 없는 오류');
            setResult(json);
            setAuditState('done');
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : '오류가 발생했습니다.');
            setAuditState('error');
        }
    }

    const localScores = calcLocalScores(channelStats, brandKit, sheets);
    const localTotal = localScores.reduce((sum, c) => sum + c.score, 0);
    const top3 = [...localScores].sort((a, b) => (a.score / a.max) - (b.score / b.max)).slice(0, 3);
    const vMatch = calcVMatch(brandKit, sheets);
    const isLoading = auditState === 'loading';

    return (
        <div className="page-content">
            <Header title="채널 감사" subtitle="채널 건강도 100점 시스템과 AI 개선 제안을 확인하세요" />

            {/* 채널 통계 카드 */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-label">구독자수</div>
                    <div className="stat-value">{channelStats ? channelStats.subscriberCount.toLocaleString() : '—'}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">총 조회수</div>
                    <div className="stat-value">{channelStats ? channelStats.totalViews.toLocaleString() : '—'}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">업로드 영상수</div>
                    <div className="stat-value">{channelStats ? `${channelStats.videoCount}개` : '—'}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">평균 참여율</div>
                    <div className="stat-value">{channelStats ? `${channelStats.avgEngagementRate.toFixed(2)}%` : '—'}</div>
                </div>
            </div>

            {/* ── D2: 로컬 100점 시스템 ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">채널 점수 100점 시스템</span>
                        <span style={{ fontSize: '22px', fontWeight: 800, color: getScoreColor(localTotal) }}>
                            {localTotal}<span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400 }}> / 100</span>
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '8px' }}>
                        {localScores.map(cat => {
                            const pct = (cat.score / cat.max) * 100;
                            const color = getScoreColor(pct);
                            return (
                                <div key={cat.label}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{cat.label}</span>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color }}>{cat.score}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/{cat.max}</span></span>
                                    </div>
                                    <div style={{ background: 'var(--border)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${pct}%`, height: '8px', borderRadius: '4px',
                                            background: color, transition: 'width 0.6s ease',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* TOP 3 개선 우선순위 */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">개선 우선순위 TOP 3</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>낮은 점수 항목 기준</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px' }}>
                        {top3.map((cat, i) => (
                            <div key={cat.label} style={{
                                padding: '12px 14px', background: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                                display: 'flex', gap: '12px', alignItems: 'flex-start',
                            }}>
                                <span style={{
                                    minWidth: '22px', height: '22px', borderRadius: '50%',
                                    background: i === 0 ? '#fc5050' : i === 1 ? '#ecc94b' : '#63b3ed',
                                    color: '#fff', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0,
                                }}>{i + 1}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{cat.label} 개선</strong>
                                        <span style={{ fontSize: '12px', color: getScoreColor((cat.score / cat.max) * 100), fontWeight: 600 }}>
                                            {cat.score}/{cat.max}점
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{cat.tip}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* J4: V-매칭 점수 */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">V-매칭 점수</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>채널 분위기 vs 생성 장르 통계</span>
                    </div>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', paddingTop: '8px', flexWrap: 'wrap' }}>
                        {/* 점수 게이지 */}
                        <ScoreGauge score={vMatch.score} />

                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <div style={{ marginBottom: '10px' }}>
                                <span style={{
                                    display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
                                    fontSize: '12px', fontWeight: 600,
                                    background: getScoreColor(vMatch.score) + '22',
                                    color: getScoreColor(vMatch.score),
                                    border: `1px solid ${getScoreColor(vMatch.score)}44`,
                                }}>
                                    {vMatch.score >= 80 ? '매우 일치' : vMatch.score >= 50 ? '보통 일치' : '개선 필요'}
                                </span>
                            </div>

                            {/* 주력 장르 vs 시트 장르 */}
                            {brandKit && (
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.5 }}>
                                    주력 장르: <strong style={{ color: 'var(--text-primary)' }}>{brandKit.primaryGenre}</strong>
                                </p>
                            )}

                            {vMatch.topGenres.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                    {vMatch.topGenres.map(g => (
                                        <span key={g.genre} style={{
                                            padding: '3px 9px', borderRadius: '14px', fontSize: '11px',
                                            background: g.isMatch ? 'rgba(72,187,120,0.12)' : 'var(--bg-secondary)',
                                            color: g.isMatch ? '#48bb78' : 'var(--text-muted)',
                                            border: `1px solid ${g.isMatch ? 'rgba(72,187,120,0.3)' : 'var(--border)'}`,
                                        }}>
                                            {g.genre} <span style={{ opacity: 0.7 }}>×{g.count}</span>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <p style={{
                                fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0,
                                padding: '8px 12px', background: 'var(--bg-secondary)',
                                borderRadius: '8px', borderLeft: '3px solid var(--accent)',
                            }}>
                                💡 {vMatch.recommendation}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI 채널 감사 */}
            <div style={{ marginBottom: '24px' }}>
                <button
                    className="btn btn-primary"
                    onClick={handleAudit}
                    disabled={isLoading}
                    style={{ minWidth: '160px' }}
                >
                    {isLoading ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="loading-pulse" style={{ width: '14px', height: '14px', borderRadius: '50%', display: 'inline-block' }} />
                            분석 중...
                        </span>
                    ) : result ? '재분석' : 'AI 채널 감사 시작'}
                </button>
            </div>

            {auditState === 'error' && (
                <div className="info-banner" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', marginBottom: '24px' }}>
                    {errorMsg}
                </div>
            )}

            {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">AI 채널 건강도</span>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: getGradeColor(result.grade) }}>{result.grade}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', padding: '16px 0' }}>
                            <ScoreGauge score={result.score} />
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>종합 평가</p>
                                <p style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: 1.6 }}>{result.summary}</p>
                                <div style={{ marginTop: '12px' }}>
                                    <span style={{
                                        display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
                                        fontSize: '13px', fontWeight: 600,
                                        background: getScoreColor(result.score) + '22',
                                        color: getScoreColor(result.score),
                                        border: `1px solid ${getScoreColor(result.score)}44`,
                                    }}>
                                        {result.score >= 71 ? '건강한 채널' : result.score >= 41 ? '성장 가능성 있음' : '집중 개선 필요'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header"><span className="card-title">AI TOP 3 개선 제안</span></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
                            {result.suggestions.map((s, i) => (
                                <div key={i} style={{
                                    padding: '14px 16px', background: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                                    display: 'flex', gap: '12px', alignItems: 'flex-start',
                                }}>
                                    <span style={{
                                        minWidth: '24px', height: '24px', borderRadius: '50%',
                                        background: 'var(--accent)', color: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '12px', fontWeight: 700, flexShrink: 0,
                                    }}>{i + 1}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{s.title}</strong>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{getPriorityLabel(s.priority)}</span>
                                        </div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{s.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!channelStats && auditState === 'idle' && (
                <div className="empty-state">
                    <p>YouTube 채널 정보가 없습니다.</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        대시보드에서 YouTube 채널을 추가하면 채널 감사를 진행할 수 있습니다.
                    </p>
                </div>
            )}
        </div>
    );
}
