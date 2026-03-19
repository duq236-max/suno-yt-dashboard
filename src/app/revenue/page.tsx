'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import DistributionChecklist from '@/components/DistributionChecklist';
import {
    loadRevenue,
    addRevenueEntry,
    deleteRevenueEntry,
    generateId,
} from '@/lib/storage';
import { RevenueEntry } from '@/types';

type Platform = RevenueEntry['platform'];

// ─── F3: 스트리밍 수익 계산기 ───────────────────────────────
interface StreamPlatform {
    id: string;
    label: string;
    icon: string;
    rateUsd: number | null;   // null = KRW 플랫폼
    rateKrw: number | null;
    currency: 'USD' | 'KRW';
}

const STREAM_PLATFORMS: StreamPlatform[] = [
    { id: 'spotify',    label: 'Spotify',      icon: '🎵', rateUsd: 0.004, rateKrw: null, currency: 'USD' },
    { id: 'apple',      label: 'Apple Music',  icon: '🍎', rateUsd: 0.007, rateKrw: null, currency: 'USD' },
    { id: 'ytmusic',    label: 'YouTube Music', icon: '▶️', rateUsd: 0.002, rateKrw: null, currency: 'USD' },
    { id: 'melon',      label: '멜론',           icon: '🍈', rateUsd: null,  rateKrw: 1.5,  currency: 'KRW' },
];

const PLATFORMS: { value: Platform; label: string; icon: string }[] = [
    { value: 'youtube',     label: 'YouTube',     icon: '▶️' },
    { value: 'distrokid',   label: 'DistroKid',   icon: '📀' },
    { value: 'spotify',     label: 'Spotify',     icon: '🎵' },
    { value: 'apple_music', label: 'Apple Music', icon: '🍎' },
    { value: 'other',       label: '기타',         icon: '💼' },
];

const FILTER_TABS: { value: Platform | 'all'; label: string }[] = [
    { value: 'all',         label: '전체' },
    { value: 'youtube',     label: 'YouTube' },
    { value: 'distrokid',   label: 'DistroKid' },
    { value: 'spotify',     label: 'Spotify' },
    { value: 'apple_music', label: 'Apple Music' },
    { value: 'other',       label: '기타' },
];

interface FormState {
    title: string;
    platform: Platform;
    amount: string;
    period: string;
    genre: string;
    views: string;
    streams: string;
}

const DEFAULT_FORM: FormState = {
    title: '',
    platform: 'youtube',
    amount: '',
    period: new Date().toISOString().slice(0, 7),
    genre: '',
    views: '',
    streams: '',
};

function fmt(n: number): string {
    return n.toLocaleString('ko-KR') + '원';
}

export default function RevenuePage() {
    const [entries, setEntries] = useState<RevenueEntry[]>([]);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [filter, setFilter] = useState<Platform | 'all'>('all');
    const [showForm, setShowForm] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // ─── F3 스트리밍 스트림 수 입력 상태 ─────────────────────
    const [streamCounts, setStreamCounts] = useState<Record<string, string>>({
        spotify: '', apple: '', ytmusic: '', melon: '',
    });

    // ─── F4 RPM 계산기 상태 ──────────────────────────────────
    const [rpm, setRpm] = useState('2.00');
    const [ytViews, setYtViews] = useState('');
    const [monthlyGoalUsd, setMonthlyGoalUsd] = useState('100');

    useEffect(() => {
        setEntries(loadRevenue());
    }, []);

    // ─── F3 계산 ────────────────────────────────────────────
    const f3TotalUsd = STREAM_PLATFORMS
        .filter(p => p.currency === 'USD')
        .reduce((sum, p) => {
            const count = parseInt(streamCounts[p.id] || '0', 10);
            return sum + (isNaN(count) ? 0 : count * (p.rateUsd ?? 0));
        }, 0);
    const f3TotalKrw = STREAM_PLATFORMS
        .filter(p => p.currency === 'KRW')
        .reduce((sum, p) => {
            const count = parseInt(streamCounts[p.id] || '0', 10);
            return sum + (isNaN(count) ? 0 : count * (p.rateKrw ?? 0));
        }, 0);

    // ─── F4 계산 ────────────────────────────────────────────
    const rpmVal     = parseFloat(rpm) || 0;
    const viewsVal   = parseInt(ytViews || '0', 10) || 0;
    const goalVal    = parseFloat(monthlyGoalUsd) || 0;
    const estimatedUsd   = (rpmVal * viewsVal) / 1000;
    const progressPct    = goalVal > 0 ? Math.min(100, (estimatedUsd / goalVal) * 100) : 0;
    const viewsNeeded    = goalVal > 0 && rpmVal > 0 ? Math.ceil((goalVal / rpmVal) * 1000) : 0;

    // ─── 요약 계산 ────────────────────────────────────────────
    const total     = entries.reduce((s, e) => s + e.amount, 0);
    const ytTotal   = entries.filter(e => e.platform === 'youtube').reduce((s, e) => s + e.amount, 0);
    const musicTotal = entries.filter(e => e.platform !== 'youtube').reduce((s, e) => s + e.amount, 0);

    // ─── 필터 적용 ────────────────────────────────────────────
    const filtered = filter === 'all' ? entries : entries.filter(e => e.platform === filter);

    // ─── 폼 핸들러 ───────────────────────────────────────────
    function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm(prev => ({ ...prev, [key]: value }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const amount = parseInt(form.amount.replace(/,/g, ''), 10);
        if (!form.title.trim() || isNaN(amount) || amount <= 0) return;

        const entry: RevenueEntry = {
            id:        generateId(),
            title:     form.title.trim(),
            platform:  form.platform,
            amount,
            period:    form.period,
            genre:     form.genre.trim() || undefined,
            views:     form.views ? parseInt(form.views, 10) : undefined,
            streams:   form.streams ? parseInt(form.streams, 10) : undefined,
            createdAt: new Date().toISOString(),
        };

        const updated = addRevenueEntry(entry);
        setEntries(updated);
        setForm(DEFAULT_FORM);
        setShowForm(false);
    }

    function handleDelete(id: string) {
        const updated = deleteRevenueEntry(id);
        setEntries(updated);
        setDeleteId(null);
    }

    const platformInfo = (p: Platform) => PLATFORMS.find(x => x.value === p) ?? PLATFORMS[4];

    return (
        <div className="page-content">
            <Header
                title="수익 관리"
                subtitle="플랫폼별 수익을 기록하고 분석하세요"
            />

            {/* ─── F2: 유통 전 체크리스트 ─── */}
            <DistributionChecklist />

            {/* ─── 요약 카드 ─── */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-label">💰 총 수익</div>
                    <div className="stat-value">{fmt(total)}</div>
                    <div className="stat-sub">{entries.length}건 합산</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">▶️ YouTube 수익</div>
                    <div className="stat-value">{fmt(ytTotal)}</div>
                    <div className="stat-sub">{entries.filter(e => e.platform === 'youtube').length}건</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">🎵 음원 수익</div>
                    <div className="stat-value">{fmt(musicTotal)}</div>
                    <div className="stat-sub">{entries.filter(e => e.platform !== 'youtube').length}건</div>
                </div>
            </div>

            {/* ─── F3: DistroKid 스트리밍 수익 계산기 ─── */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-header">
                    <h2 className="card-title">📀 스트리밍 수익 계산기</h2>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '8px 0 16px' }}>
                    플랫폼별 스트리밍 수를 입력하면 예상 수익을 계산합니다.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {STREAM_PLATFORMS.map(p => {
                        const count = parseInt(streamCounts[p.id] || '0', 10);
                        const rev = isNaN(count) ? 0 :
                            p.currency === 'USD'
                                ? count * (p.rateUsd ?? 0)
                                : count * (p.rateKrw ?? 0);
                        return (
                            <div
                                key={p.id}
                                style={{
                                    padding: '14px',
                                    borderRadius: '8px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '18px' }}>{p.icon}</span>
                                    <span style={{ fontWeight: 500, fontSize: '14px' }}>{p.label}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                        단가 {p.currency === 'USD' ? `$${p.rateUsd}` : `₩${p.rateKrw}`}/스트림
                                    </span>
                                </div>
                                <input
                                    className="form-input"
                                    type="number"
                                    min={0}
                                    value={streamCounts[p.id]}
                                    onChange={e => setStreamCounts(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    placeholder="스트리밍 수 입력"
                                    style={{ marginBottom: '8px' }}
                                />
                                <div style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>
                                    예상: {p.currency === 'USD'
                                        ? `$${rev.toFixed(2)}`
                                        : `₩${rev.toLocaleString('ko-KR')}`}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div style={{
                    marginTop: '16px',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    background: 'rgba(229,62,62,0.08)',
                    border: '1px solid rgba(229,62,62,0.2)',
                    display: 'flex',
                    gap: '24px',
                    flexWrap: 'wrap',
                }}>
                    <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>USD 합계</span>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent)' }}>
                            ${f3TotalUsd.toFixed(2)}
                        </div>
                    </div>
                    {f3TotalKrw > 0 && (
                        <div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>KRW 합계 (멜론)</span>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>
                                ₩{f3TotalKrw.toLocaleString('ko-KR')}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── F4: YouTube RPM 계산기 ─── */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-header">
                    <h2 className="card-title">▶️ YouTube RPM 계산기</h2>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '8px 0 16px' }}>
                    RPM과 조회수로 예상 수익을 계산하고 월 목표 달성에 필요한 조회수를 역산합니다.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                    <div className="form-group">
                        <label className="form-label">RPM ($/1000 조회수)</label>
                        <input
                            className="form-input"
                            type="number"
                            min={0}
                            step={0.1}
                            value={rpm}
                            onChange={e => setRpm(e.target.value)}
                            placeholder="예: 2.0"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">예상 조회수</label>
                        <input
                            className="form-input"
                            type="number"
                            min={0}
                            value={ytViews}
                            onChange={e => setYtViews(e.target.value)}
                            placeholder="예: 50000"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">월 목표 수익 (USD)</label>
                        <input
                            className="form-input"
                            type="number"
                            min={0}
                            value={monthlyGoalUsd}
                            onChange={e => setMonthlyGoalUsd(e.target.value)}
                            placeholder="예: 100"
                        />
                    </div>
                </div>

                {/* 결과 패널 */}
                <div style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                }}>
                    <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>예상 수익</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)' }}>
                                ${estimatedUsd.toFixed(2)}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>목표까지 필요 조회수</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: viewsNeeded > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                                {viewsNeeded > 0 ? viewsNeeded.toLocaleString('ko-KR') : '—'}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>달성률</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: progressPct >= 100 ? '#22c55e' : 'var(--text-primary)' }}>
                                {progressPct.toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    {/* 프로그레스바 */}
                    <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span>진행률</span>
                        <span>${estimatedUsd.toFixed(2)} / ${goalVal.toFixed(2)}</span>
                    </div>
                    <div style={{
                        height: '8px',
                        borderRadius: '4px',
                        background: 'var(--border)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${progressPct}%`,
                            borderRadius: '4px',
                            background: progressPct >= 100 ? '#22c55e' : progressPct >= 60 ? '#f59e0b' : 'var(--accent)',
                            transition: 'width 0.3s ease',
                        }} />
                    </div>
                </div>
            </div>

            {/* ─── 수익 입력 폼 토글 ─── */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="card-title">수익 입력</h2>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowForm(v => !v)}
                    >
                        {showForm ? '✕ 닫기' : '+ 수익 추가'}
                    </button>
                </div>

                {showForm && (
                    <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <div className="form-group">
                                <label className="form-label">곡 제목 *</label>
                                <input
                                    className="form-input"
                                    value={form.title}
                                    onChange={e => setField('title', e.target.value)}
                                    placeholder="예: Lofi Rain Beats"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">플랫폼 *</label>
                                <select
                                    className="form-select"
                                    value={form.platform}
                                    onChange={e => setField('platform', e.target.value as Platform)}
                                >
                                    {PLATFORMS.map(p => (
                                        <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">수익 금액 (원) *</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min={1}
                                    value={form.amount}
                                    onChange={e => setField('amount', e.target.value)}
                                    placeholder="예: 15000"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">기간 (년-월) *</label>
                                <input
                                    className="form-input"
                                    type="month"
                                    value={form.period}
                                    onChange={e => setField('period', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">장르</label>
                                <input
                                    className="form-input"
                                    value={form.genre}
                                    onChange={e => setField('genre', e.target.value)}
                                    placeholder="예: Lofi, Pop, Jazz"
                                />
                            </div>
                            {form.platform === 'youtube' ? (
                                <div className="form-group">
                                    <label className="form-label">조회수</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        min={0}
                                        value={form.views}
                                        onChange={e => setField('views', e.target.value)}
                                        placeholder="예: 50000"
                                    />
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label className="form-label">스트리밍 횟수</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        min={0}
                                        value={form.streams}
                                        onChange={e => setField('streams', e.target.value)}
                                        placeholder="예: 12000"
                                    />
                                </div>
                            )}
                        </div>
                        <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setForm(DEFAULT_FORM); setShowForm(false); }}>
                                취소
                            </button>
                            <button type="submit" className="btn btn-primary btn-sm">
                                저장
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* ─── 내역 테이블 ─── */}
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <h2 className="card-title">수익 내역</h2>
                    {/* 플랫폼 필터 탭 */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {FILTER_TABS.map(tab => (
                            <button
                                key={tab.value}
                                className={`btn btn-sm ${filter === tab.value ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setFilter(tab.value)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>💰</div>
                        <p>아직 수익 내역이 없습니다.</p>
                        <p style={{ fontSize: '13px', opacity: 0.6 }}>위의 &lsquo;+ 수익 추가&rsquo; 버튼으로 첫 수익을 기록해 보세요!</p>
                    </div>
                ) : (
                    <div className="table-wrapper" style={{ marginTop: '12px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>기간</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>곡 제목</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>플랫폼</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>장르</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500 }}>조회/스트림</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500 }}>수익</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 500 }}>삭제</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(entry => {
                                    const p = platformInfo(entry.platform);
                                    const playCount = entry.platform === 'youtube'
                                        ? (entry.views != null ? entry.views.toLocaleString('ko-KR') + ' 회' : '—')
                                        : (entry.streams != null ? entry.streams.toLocaleString('ko-KR') + ' 스트림' : '—');
                                    return (
                                        <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{entry.period}</td>
                                            <td style={{ padding: '10px 12px', fontWeight: 500 }}>{entry.title}</td>
                                            <td style={{ padding: '10px 12px' }}>{p.icon} {p.label}</td>
                                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{entry.genre ?? '—'}</td>
                                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{playCount}</td>
                                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{fmt(entry.amount)}</td>
                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => setDeleteId(entry.id)}
                                                    title="삭제"
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ─── 삭제 확인 모달 ─── */}
            {deleteId && (
                <div className="modal-overlay" onClick={() => setDeleteId(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '360px' }}>
                        <div className="modal-header">
                            <h3>수익 항목 삭제</h3>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '12px 0 20px' }}>
                            이 수익 항목을 삭제하시겠습니까? 되돌릴 수 없습니다.
                        </p>
                        <div className="modal-footer">
                            <button className="btn btn-ghost btn-sm" onClick={() => setDeleteId(null)}>취소</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(deleteId)}>삭제</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
