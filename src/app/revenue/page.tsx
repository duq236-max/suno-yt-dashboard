'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import {
    loadRevenue,
    addRevenueEntry,
    deleteRevenueEntry,
    generateId,
} from '@/lib/storage';
import { RevenueEntry } from '@/types';

type Platform = RevenueEntry['platform'];

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

    useEffect(() => {
        setEntries(loadRevenue());
    }, []);

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
