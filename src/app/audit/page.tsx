'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { loadData } from '@/lib/storage';
import type { AuditResult, AuditSuggestion } from '@/app/api/gemini/audit/route';

type AuditState = 'idle' | 'loading' | 'done' | 'error';

interface ChannelStats {
    channelName: string;
    subscriberCount: number;
    totalViews: number;
    videoCount: number;
    avgEngagementRate: number;
}

function getScoreColor(score: number): string {
    if (score >= 71) return '#48bb78'; // 초록
    if (score >= 41) return '#ecc94b'; // 노랑
    return '#fc5050';                   // 빨강
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

function ScoreGauge({ score }: { score: number }) {
    const color = getScoreColor(score);
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
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

export default function AuditPage() {
    const [apiKey, setApiKey] = useState('');
    const [channelStats, setChannelStats] = useState<ChannelStats | null>(null);
    const [auditState, setAuditState] = useState<AuditState>('idle');
    const [result, setResult] = useState<AuditResult | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // 채널 정보 로드
    useEffect(() => {
        const data = loadData();
        setApiKey(data.geminiApiKey ?? '');

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
        if (!apiKey) {
            setErrorMsg('설정 페이지에서 Gemini API 키를 먼저 입력하세요.');
            setAuditState('error');
            return;
        }
        if (!channelStats) {
            setErrorMsg('대시보드에서 YouTube 채널을 먼저 추가해주세요.');
            setAuditState('error');
            return;
        }

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

    const isLoading = auditState === 'loading';

    return (
        <div className="page-content">
            <Header
                title="채널 감사"
                subtitle="채널 건강도 점수와 AI 개선 제안을 확인하세요"
            />

            {/* 채널 통계 카드 */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-label">구독자수</div>
                    <div className="stat-value">
                        {channelStats ? channelStats.subscriberCount.toLocaleString() : '—'}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">총 조회수</div>
                    <div className="stat-value">
                        {channelStats ? channelStats.totalViews.toLocaleString() : '—'}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">업로드 영상수</div>
                    <div className="stat-value">
                        {channelStats ? `${channelStats.videoCount}개` : '—'}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">평균 참여율</div>
                    <div className="stat-value">
                        {channelStats ? `${channelStats.avgEngagementRate.toFixed(2)}%` : '—'}
                    </div>
                </div>
            </div>

            {/* 분석 버튼 */}
            <div style={{ marginBottom: '24px' }}>
                <button
                    className="btn btn-primary"
                    onClick={handleAudit}
                    disabled={isLoading}
                    style={{ minWidth: '140px' }}
                >
                    {isLoading ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="loading-pulse" style={{ width: '14px', height: '14px', borderRadius: '50%', display: 'inline-block' }} />
                            분석 중...
                        </span>
                    ) : result ? '재분석' : 'AI 채널 감사 시작'}
                </button>
            </div>

            {/* 에러 */}
            {auditState === 'error' && (
                <div className="info-banner" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', marginBottom: '24px' }}>
                    {errorMsg}
                </div>
            )}

            {/* 결과 */}
            {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* 점수 카드 */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">채널 건강도 점수</span>
                            <span style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                color: getGradeColor(result.grade),
                            }}>
                                {result.grade}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', padding: '16px 0' }}>
                            <ScoreGauge score={result.score} />
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>종합 평가</p>
                                <p style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: '1.6' }}>
                                    {result.summary}
                                </p>
                                <div style={{ marginTop: '12px' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '13px',
                                        fontWeight: '600',
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

                    {/* TOP 3 개선 제안 */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">TOP 3 개선 제안</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
                            {result.suggestions.map((s, i) => (
                                <div key={i} style={{
                                    padding: '14px 16px',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    gap: '12px',
                                    alignItems: 'flex-start',
                                }}>
                                    <span style={{
                                        minWidth: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: 'var(--accent)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        flexShrink: 0,
                                    }}>
                                        {i + 1}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{s.title}</strong>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {getPriorityLabel(s.priority)}
                                            </span>
                                        </div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                                            {s.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 채널 없을 때 안내 */}
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
