'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { loadData, updateChannel, generateId } from '@/lib/supabase-storage';
import { ChannelInfo } from '@/types';
import { useRouter } from 'next/navigation';
import type { PlannerReport, ContentCalendarItem } from '@/app/api/gemini/planner/route';
import { CreativityPanel } from '@/components/CreativityPanel';

const STEPS = [
    { id: 1, title: '음악 장르', subtitle: '채널의 주요 음악 장르를 선택하세요' },
    { id: 2, title: '타겟 시청자', subtitle: '어떤 상황에서 들을 음악을 만드나요?' },
    { id: 3, title: '업로드 빈도', subtitle: '얼마나 자주 업로드할 계획인가요?' },
    { id: 4, title: '채널 이름', subtitle: '채널 이름과 유튜브 채널명을 입력하세요' },
    { id: 5, title: '채널 콘셉트', subtitle: '채널의 분위기와 방향을 한 문장으로' },
    { id: 6, title: '완료!', subtitle: '채널 전략 요약을 확인하세요' },
];

const GENRES = ['Lo-fi Hip-hop', 'Jazz', 'Classical Piano', 'Ambient', 'EDM / Electronic', 'Chillhop', 'Nature Sounds', '수면 음악', '카페 BGM', '명상 음악'];
const AUDIENCES = ['집중력 향상 (공부/업무)', '수면 / 휴식', '운동 / 에너지', '카페 / 힐링', '명상 / 요가', '감성 / 감상'];
const FREQUENCIES = ['매일 1개', '주 3개', '주 1개', '격주 1개'];

const FREQ_EMOJI: Record<string, string> = {
    '매일 1개': '🔥',
    '주 3개': '⚡',
    '주 1개': '📅',
    '격주 1개': '🌙',
};

type ReportState = 'idle' | 'loading' | 'done' | 'error';

function CalendarCard({ item }: { item: ContentCalendarItem }) {
    return (
        <div style={{
            padding: '14px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                    {item.week}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.theme}
                </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                {item.titles.map((title, i) => (
                    <div key={i} style={{ fontSize: '12.5px', color: 'var(--text-muted)', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
                        {title}
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {item.hashtags.map((tag, i) => (
                    <span key={i} style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        background: 'rgba(229,62,62,0.08)',
                        color: 'var(--accent)',
                        border: '1px solid rgba(229,62,62,0.2)',
                    }}>
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function PlannerPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [existing, setExisting] = useState<ChannelInfo | null>(null);
    const [form, setForm] = useState({
        genre: '',
        targetAudience: '',
        uploadFrequency: '',
        name: '',
        youtubeName: '',
        concept: '',
    });

    // AI 리포트 상태
    const [reportState, setReportState] = useState<ReportState>('idle');
    const [report, setReport] = useState<PlannerReport | null>(null);
    const [reportError, setReportError] = useState('');
    const [creativity, setCreativity] = useState({ temperature: 0.7, topP: 0.9, topK: 30 });

    // J3: 플레이리스트 순서 도우미 상태
    const [playlistSongCount, setPlaylistSongCount] = useState(4);
    const [playlistBpmRange, setPlaylistBpmRange] = useState('80-120');
    const [playlistMoodFlow, setPlaylistMoodFlow] = useState<'upbeat_to_down' | 'down_to_up' | 'even'>('even');
    const [playlistResult, setPlaylistResult] = useState('');
    const [playlistState, setPlaylistState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [playlistError, setPlaylistError] = useState('');

    useEffect(() => {
        const fetchChannel = async () => {
            const data = await loadData();
            if (data.channel) {
                setExisting(data.channel);
                setForm({
                    genre: data.channel.genre,
                    targetAudience: data.channel.targetAudience,
                    uploadFrequency: data.channel.uploadFrequency,
                    name: data.channel.name,
                    youtubeName: data.channel.youtubeName || '',
                    concept: '',
                });
            }
        };
        fetchChannel();
    }, []);

    function next() { setStep((s) => Math.min(s + 1, 6)); }
    function prev() { setStep((s) => Math.max(s - 1, 1)); }

    function canNext(): boolean {
        if (step === 1) return !!form.genre;
        if (step === 2) return !!form.targetAudience;
        if (step === 3) return !!form.uploadFrequency;
        if (step === 4) return !!form.name.trim();
        return true;
    }

    function goToStep6() {
        setStep(6);
        generateReport();
    }

    async function generateReport() {
        const data = await loadData();
        const apiKey = data.geminiApiKey;

        if (!apiKey) {
            setReportState('error');
            setReportError('설정 페이지에서 Gemini API 키를 입력하면 AI 리포트를 받을 수 있습니다.');
            return;
        }

        setReportState('loading');
        setReport(null);
        setReportError('');

        try {
            const res = await fetch('/api/gemini/planner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey,
                    channelName: form.name.trim() || '내 채널',
                    genre: form.genre,
                    targetAudience: form.targetAudience,
                    uploadFrequency: form.uploadFrequency,
                    concept: form.concept,
                    youtubeName: form.youtubeName,
                    creativityParams: creativity,
                }),
            });
            const json = await res.json() as PlannerReport & { error?: string };

            if (!res.ok || json.error) throw new Error(json.error ?? '알 수 없는 오류');

            setReport(json);
            setReportState('done');
        } catch (err) {
            setReportError(err instanceof Error ? err.message : '리포트 생성에 실패했습니다.');
            setReportState('error');
        }
    }

    // J3: 플레이리스트 순서 AI 추천 API 호출
    async function generatePlaylistOrder() {
        const data = await loadData();
        const apiKey = data.geminiApiKey;
        if (!apiKey) {
            setPlaylistError('설정 페이지에서 Gemini API 키를 먼저 입력하세요.');
            setPlaylistState('error');
            return;
        }
        setPlaylistState('loading');
        setPlaylistResult('');
        setPlaylistError('');
        try {
            const res = await fetch('/api/gemini/playlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey,
                    songCount: playlistSongCount,
                    bpmRange: playlistBpmRange,
                    moodFlow: playlistMoodFlow,
                }),
            });
            const json = await res.json() as { result?: string; error?: string };
            if (!res.ok || json.error) throw new Error(json.error ?? '알 수 없는 오류');
            setPlaylistResult(json.result ?? '');
            setPlaylistState('done');
        } catch (err) {
            setPlaylistError(err instanceof Error ? err.message : '오류가 발생했습니다.');
            setPlaylistState('error');
        }
    }

    async function finish() {
        const channel: ChannelInfo = {
            id: existing?.id || generateId(),
            name: form.name.trim() || '내 채널',
            genre: form.genre,
            targetAudience: form.targetAudience,
            uploadFrequency: form.uploadFrequency,
            youtubeName: form.youtubeName.trim(),
            createdAt: existing?.createdAt || new Date().toISOString(),
        };
        await updateChannel(channel);
        router.push('/dashboard');
    }

    const progress = ((step - 1) / 5) * 100;

    return (
        <>
            <Header title="채널기획" subtitle={`${step}/5단계 — ${STEPS[step - 1].subtitle}`} />
            <div className="page-content" style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: '620px' }}>

                    {/* 진행률 */}
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>CHANNEL PLANNING</span>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Step {step}/5</span>
                        </div>
                        <div style={{ height: '4px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${Math.max(progress, step === 6 ? 100 : 0)}%`,
                                background: 'linear-gradient(90deg, #7c3aed, var(--accent))',
                                borderRadius: '4px', transition: 'width 0.4s ease',
                            }} />
                        </div>
                    </div>

                    {/* 스텝 카드 */}
                    <div className="card" style={{ padding: '32px' }}>
                        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                Step {step} — {STEPS[step - 1].title}
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {STEPS[step - 1].subtitle}
                            </div>
                        </div>

                        {/* Step 1: 장르 */}
                        {step === 1 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                {GENRES.map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => setForm((f) => ({ ...f, genre: g }))}
                                        style={{
                                            padding: '14px', borderRadius: '10px', cursor: 'pointer',
                                            border: `2px solid ${form.genre === g ? 'var(--accent)' : 'var(--border)'}`,
                                            background: form.genre === g ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                                            color: form.genre === g ? 'var(--accent)' : 'var(--text-secondary)',
                                            fontSize: '13.5px', fontWeight: form.genre === g ? 700 : 400,
                                            transition: 'all 0.15s ease', textAlign: 'center',
                                        }}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Step 2: 타겟 */}
                        {step === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {AUDIENCES.map((a) => (
                                    <button
                                        key={a}
                                        onClick={() => setForm((f) => ({ ...f, targetAudience: a }))}
                                        style={{
                                            padding: '14px 18px', borderRadius: '10px', cursor: 'pointer',
                                            border: `2px solid ${form.targetAudience === a ? 'var(--accent)' : 'var(--border)'}`,
                                            background: form.targetAudience === a ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                                            color: form.targetAudience === a ? 'var(--accent)' : 'var(--text-secondary)',
                                            fontSize: '13.5px', fontWeight: form.targetAudience === a ? 700 : 400,
                                            transition: 'all 0.15s ease', textAlign: 'left',
                                        }}
                                    >
                                        {a}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Step 3: 업로드 빈도 */}
                        {step === 3 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                {FREQUENCIES.map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setForm((fm) => ({ ...fm, uploadFrequency: f }))}
                                        style={{
                                            padding: '20px 14px', borderRadius: '10px', cursor: 'pointer',
                                            border: `2px solid ${form.uploadFrequency === f ? 'var(--accent)' : 'var(--border)'}`,
                                            background: form.uploadFrequency === f ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                                            color: form.uploadFrequency === f ? 'var(--accent)' : 'var(--text-secondary)',
                                            fontSize: '14px', fontWeight: form.uploadFrequency === f ? 700 : 400,
                                            transition: 'all 0.15s ease', textAlign: 'center',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                        }}
                                    >
                                        <span style={{ fontSize: '24px' }}>{FREQ_EMOJI[f]}</span>
                                        {f}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Step 4: 채널 이름 */}
                        {step === 4 && (
                            <div>
                                <div className="form-group">
                                    <label className="form-label">채널 프로젝트명 *</label>
                                    <input
                                        className="form-input"
                                        placeholder="예: 새벽 Lo-fi 채널"
                                        value={form.name}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">유튜브 채널명 (옵션)</label>
                                    <input
                                        className="form-input"
                                        placeholder="예: @DawnLofi"
                                        value={form.youtubeName}
                                        onChange={(e) => setForm((f) => ({ ...f, youtubeName: e.target.value }))}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 5: 콘셉트 */}
                        {step === 5 && (
                            <div className="form-group">
                                <label className="form-label">채널 콘셉트 한 줄 소개</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="예: 새벽 감성을 담은 Lo-fi 음악으로 공부와 휴식에 최적화된 채널"
                                    value={form.concept}
                                    onChange={(e) => setForm((f) => ({ ...f, concept: e.target.value }))}
                                    style={{ minHeight: '100px' }}
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Step 6: 완료 요약 + AI 리포트 */}
                        {step === 6 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* 설문 요약 */}
                                <div style={{ textAlign: 'center', fontSize: '40px', marginBottom: '8px' }}>🎉</div>
                                {[
                                    { label: '채널명', value: form.name },
                                    { label: '장르', value: form.genre },
                                    { label: '타겟', value: form.targetAudience },
                                    { label: '업로드', value: form.uploadFrequency },
                                    { label: '유튜브', value: form.youtubeName || '미설정' },
                                    ...(form.concept ? [{ label: '콘셉트', value: form.concept }] : []),
                                ].map((row) => (
                                    <div key={row.label} style={{
                                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                                        padding: '12px 14px', background: 'var(--bg-secondary)',
                                        borderRadius: '8px', border: '1px solid var(--border)',
                                    }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '55px', paddingTop: '2px', textTransform: 'uppercase' }}>
                                            {row.label}
                                        </span>
                                        <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                            {row.value}
                                        </span>
                                    </div>
                                ))}

                                {/* AI 리포트 섹션 */}
                                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            AI 채널 전략 리포트
                                        </span>
                                        {reportState === 'error' && (
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={generateReport}
                                                style={{ fontSize: '12px' }}
                                            >
                                                재시도
                                            </button>
                                        )}
                                    </div>

                                    {reportState === 'loading' && (
                                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                            <span className="loading-pulse" style={{ width: '16px', height: '16px', borderRadius: '50%', display: 'inline-block', marginBottom: '8px' }} />
                                            <div>Gemini가 채널 전략을 분석 중입니다...</div>
                                        </div>
                                    )}

                                    {reportState === 'error' && (
                                        <div className="info-banner" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', fontSize: '13px' }}>
                                            {reportError}
                                        </div>
                                    )}

                                    {report && reportState === 'done' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                                            {/* 타겟 포지셔닝 */}
                                            <div style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(229,62,62,0.06), rgba(124,58,237,0.06))', borderRadius: 'var(--radius-md)', border: '1px solid rgba(229,62,62,0.15)' }}>
                                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                                                    타겟 포지셔닝
                                                </div>
                                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                                    {report.targetPositioning}
                                                </div>
                                            </div>

                                            {/* 경쟁 차별화 포인트 */}
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                                                    경쟁 차별화 포인트
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {report.differentiationPoints.map((pt, i) => (
                                                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                            <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                                                            {pt}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 콘텐츠 캘린더 */}
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                                                    4주 콘텐츠 캘린더
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {report.contentCalendar.map((item, i) => (
                                                        <CalendarCard key={i} item={item} />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 즉시 실행 액션 */}
                                            <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                                                    즉시 실행 액션
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {report.urgentActions.map((action, i) => (
                                                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                                                            <span style={{ fontSize: '14px', flexShrink: 0 }}>
                                                                {i === 0 ? '🔴' : i === 1 ? '🟡' : '🟢'}
                                                            </span>
                                                            {action}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 성장 전략 */}
                                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>성장 전략: </span>
                                                {report.growthStrategy}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 하단 버튼 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                        <button
                            className="btn btn-ghost"
                            onClick={step === 1 ? () => router.push('/dashboard') : prev}
                        >
                            ← {step === 1 ? '취소' : '이전'}
                        </button>
                        {step < 5 ? (
                            <button
                                className="btn btn-primary"
                                onClick={next}
                                disabled={!canNext()}
                            >
                                다음 →
                            </button>
                        ) : step === 5 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', width: '100%' }}>
                                <CreativityPanel value={creativity} onChange={setCreativity} />
                                <button
                                    className="btn btn-primary"
                                    onClick={goToStep6}
                                >
                                    완료 — AI 리포트 받기 ✨
                                </button>
                            </div>
                        ) : (
                            <button className="btn btn-primary" onClick={finish}>
                                ✅ 채널 저장하기
                            </button>
                        )}
                    </div>

                    {/* J3: 플레이리스트 순서 설계 도우미 */}
                    <div className="card" style={{ marginTop: '28px', padding: '24px' }}>
                        <h3 className="card-title" style={{ marginBottom: '4px', fontSize: '15px' }}>
                            🎵 플레이리스트 순서 AI 추천
                        </h3>
                        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '20px', marginTop: '4px' }}>
                            보유 곡의 최적 재생 순서 전략을 Gemini가 제안합니다
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            {/* 보유 곡 수 */}
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">보유 곡 수</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    min={2}
                                    max={100}
                                    value={playlistSongCount}
                                    onChange={(e) => setPlaylistSongCount(Math.max(2, Number(e.target.value)))}
                                    style={{ fontSize: '14px' }}
                                />
                            </div>
                            {/* 주 BPM 범위 */}
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">주 BPM 범위</label>
                                <input
                                    className="form-input"
                                    value={playlistBpmRange}
                                    onChange={(e) => setPlaylistBpmRange(e.target.value)}
                                    placeholder="예: 80-120"
                                    style={{ fontSize: '14px' }}
                                />
                            </div>
                        </div>

                        {/* 분위기 흐름 */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                분위기 흐름
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {([
                                    { value: 'upbeat_to_down', label: '⬇ 업비트→다운비트' },
                                    { value: 'down_to_up', label: '⬆ 다운비트→업비트' },
                                    { value: 'even', label: '➡ 균일' },
                                ] as const).map(({ value, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => setPlaylistMoodFlow(value)}
                                        style={{
                                            padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                                            border: `1.5px solid ${playlistMoodFlow === value ? 'var(--accent)' : 'var(--border)'}`,
                                            background: playlistMoodFlow === value ? 'rgba(229,62,62,0.1)' : 'var(--bg-secondary)',
                                            color: playlistMoodFlow === value ? 'var(--accent)' : 'var(--text-muted)',
                                            fontWeight: playlistMoodFlow === value ? 700 : 400,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            className="btn btn-secondary"
                            onClick={generatePlaylistOrder}
                            disabled={playlistState === 'loading'}
                            style={{ minWidth: '180px' }}
                        >
                            {playlistState === 'loading' ? '분석 중...' : '🎧 순서 전략 추천받기'}
                        </button>

                        {/* 에러 */}
                        {playlistState === 'error' && (
                            <div style={{ marginTop: '14px', padding: '12px 14px', background: 'rgba(229,62,62,0.08)', borderRadius: '8px', color: 'var(--accent)', fontSize: '13px' }}>
                                {playlistError}
                            </div>
                        )}

                        {/* 결과 */}
                        {playlistState === 'done' && playlistResult && (
                            <div style={{
                                marginTop: '16px', padding: '16px', background: 'var(--bg-secondary)',
                                borderRadius: '10px', border: '1px solid var(--border)',
                                fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.8,
                                whiteSpace: 'pre-wrap',
                            }}>
                                {playlistResult}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
