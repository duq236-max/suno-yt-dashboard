'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { loadData, updateBrandKit } from '@/lib/supabase-storage';
import type { BrandKit } from '@/types';

function toArray(val: string): string[] {
    return val.split(',').map(s => s.trim()).filter(Boolean);
}

const EMPTY_FORM = { channelName: '', tagline: '', primaryGenre: '', subGenres: '', targetAudience: '', moodKeywords: '', avoidKeywords: '', promptTemplate: '' };

export default function BrandKitPage() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadData().then(({ brandKit: kit }) => {
            if (!kit) return;
            setForm({
                channelName: kit.channelName,
                tagline: kit.tagline,
                primaryGenre: kit.primaryGenre,
                subGenres: kit.subGenres.join(', '),
                targetAudience: kit.targetAudience,
                moodKeywords: kit.moodKeywords.join(', '),
                avoidKeywords: kit.avoidKeywords.join(', '),
                promptTemplate: kit.promptTemplate,
            });
        });
    }, []);

    const hasKit = form.channelName.trim().length > 0;

    async function handleSave() {
        const kit: BrandKit = {
            channelName: form.channelName.trim(),
            tagline: form.tagline.trim(),
            primaryGenre: form.primaryGenre.trim(),
            subGenres: toArray(form.subGenres),
            targetAudience: form.targetAudience.trim(),
            moodKeywords: toArray(form.moodKeywords),
            avoidKeywords: toArray(form.avoidKeywords),
            promptTemplate: form.promptTemplate.trim(),
            updatedAt: new Date().toISOString(),
        };
        await updateBrandKit(kit);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    }

    function set(field: keyof typeof form, value: string) {
        setForm(prev => ({ ...prev, [field]: value }));
    }

    const accentPurple = 'rgba(99, 102, 241, 0.25)';
    const bgPurple = 'rgba(99, 102, 241, 0.04)';

    return (
        <>
            <Header title="브랜드킷" />
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <div className="page-title">🎨 브랜드킷</div>
                        <div className="page-subtitle">채널 정체성과 프롬프트 기본값을 한 곳에 정의하세요</div>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        style={{
                            background: saved ? '#22c55e' : undefined,
                            transition: 'background 0.3s',
                            minWidth: '100px',
                        }}
                    >
                        {saved ? '✅ 저장됨' : '💾 저장'}
                    </button>
                </div>

                {hasKit && (
                    <div className="info-banner" style={{ marginBottom: '20px' }}>
                        ✅ 브랜드킷이 저장되어 있습니다. 스크랩시트 생성 시 자동으로 기본값으로 사용됩니다.
                    </div>
                )}

                <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* ─── 채널 기본 정보 ─── */}
                    <div className="card" style={{ borderColor: accentPurple, background: bgPurple }}>
                        <div className="card-title" style={{ marginBottom: '16px', color: '#818cf8' }}>📺 채널 기본 정보</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="form-group">
                                <label className="form-label">채널 이름</label>
                                <input
                                    className="form-input"
                                    placeholder="예: LoFi Dream Station"
                                    value={form.channelName}
                                    onChange={e => set('channelName', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">채널 슬로건 (Tagline)</label>
                                <input
                                    className="form-input"
                                    placeholder="예: Beats for late-night focus sessions"
                                    value={form.tagline}
                                    onChange={e => set('tagline', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">타깃 오디언스</label>
                                <input
                                    className="form-input"
                                    placeholder="예: 20-30대 공부/집중 리스너"
                                    value={form.targetAudience}
                                    onChange={e => set('targetAudience', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ─── 장르 설정 ─── */}
                    <div className="card">
                        <div className="card-title" style={{ marginBottom: '16px' }}>🎵 장르 설정</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="form-group">
                                <label className="form-label">대표 장르</label>
                                <input
                                    className="form-input"
                                    placeholder="예: Lo-Fi Hip Hop"
                                    value={form.primaryGenre}
                                    onChange={e => set('primaryGenre', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">서브 장르 (콤마로 구분)</label>
                                <input
                                    className="form-input"
                                    placeholder="예: Chillhop, Ambient, Jazz-Hop"
                                    value={form.subGenres}
                                    onChange={e => set('subGenres', e.target.value)}
                                />
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    콤마(,)로 여러 장르를 구분하세요
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── 키워드 설정 ─── */}
                    <div className="card">
                        <div className="card-title" style={{ marginBottom: '16px' }}>🏷️ 키워드 설정</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="form-group">
                                <label className="form-label">분위기 키워드 (Mood)</label>
                                <input
                                    className="form-input"
                                    placeholder="예: chill, relaxing, nostalgic, dreamy"
                                    value={form.moodKeywords}
                                    onChange={e => set('moodKeywords', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">금지 키워드 (Avoid)</label>
                                <input
                                    className="form-input"
                                    placeholder="예: aggressive, harsh, distorted"
                                    value={form.avoidKeywords}
                                    onChange={e => set('avoidKeywords', e.target.value)}
                                />
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    AI 프롬프트 생성 시 이 키워드들이 자동으로 제외됩니다
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── 프롬프트 템플릿 ─── */}
                    <div className="card" style={{ borderColor: 'rgba(229, 62, 62, 0.15)', background: 'rgba(229, 62, 62, 0.02)' }}>
                        <div className="card-title" style={{ marginBottom: '8px' }}>📝 기본 프롬프트 템플릿</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.7 }}>
                            AI가 새 프롬프트를 생성할 때 이 템플릿을 기반으로 확장합니다.{' '}
                            <code style={{ background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>{'{{genre}}'}</code>,{' '}
                            <code style={{ background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>{'{{mood}}'}</code> 변수를 사용할 수 있습니다.
                        </div>
                        <textarea
                            className="form-textarea"
                            rows={5}
                            placeholder={'예: Create a {{genre}} track with {{mood}} vibes. Perfect for late-night study sessions. No lyrics, instrumental only.'}
                            value={form.promptTemplate}
                            onChange={e => set('promptTemplate', e.target.value)}
                            style={{ fontFamily: 'monospace', fontSize: '12px' }}
                        />
                    </div>

                    {/* ─── 미리보기 ─── */}
                    {(form.channelName || form.primaryGenre || form.moodKeywords) && (
                        <div className="card" style={{ borderColor: 'rgba(34, 197, 94, 0.2)', background: 'rgba(34, 197, 94, 0.03)' }}>
                            <div className="card-title" style={{ marginBottom: '12px', color: '#22c55e' }}>👁️ 미리보기</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                {form.channelName && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <span style={{ color: 'var(--text-muted)', minWidth: '80px' }}>채널명</span>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{form.channelName}</span>
                                    </div>
                                )}
                                {form.primaryGenre && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <span style={{ color: 'var(--text-muted)', minWidth: '80px' }}>주 장르</span>
                                        <span style={{ color: 'var(--text-primary)' }}>{form.primaryGenre}</span>
                                    </div>
                                )}
                                {form.moodKeywords && (
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ color: 'var(--text-muted)', minWidth: '80px' }}>무드</span>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {toArray(form.moodKeywords).map(k => (
                                                <span key={k} style={{
                                                    padding: '2px 8px', borderRadius: '20px',
                                                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                                    fontSize: '11px', color: 'var(--text-secondary)',
                                                }}>{k}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
