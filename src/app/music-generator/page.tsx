'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ChipSelector from '@/components/ChipSelector';
import SongResultCard from '@/components/SongResultCard';
import { MUSIC_CHIPS } from '@/data/music-chips';
import type { MusicGeneratorForm, GeneratedSong } from '@/types/music-generator';
import { loadData } from '@/lib/supabase-storage';

type ActiveTab = 'generate' | 'cover' | 'marketing';

const DEFAULT_FORM: MusicGeneratorForm = {
    genres: [],
    moods: [],
    vocals: [],
    usage: [],
    instruments: [],
    bpm: '',
    targetAge: '',
    language: '',
    theme: [],
    customRequest: '',
    shortsMode: false,
    model: 'flash',
};

/** 섹션 id → MusicGeneratorForm 키 매핑. 단일값 섹션은 string, 다중값은 string[] */
type FormArrayKey = 'genres' | 'moods' | 'vocals' | 'usage' | 'instruments' | 'theme';
type FormStringKey = 'bpm' | 'targetAge' | 'language';
const ARRAY_KEYS = new Set<string>(['genres', 'moods', 'vocals', 'usage', 'instruments', 'theme']);

export default function MusicGeneratorPage() {
    const [form, setForm] = useState<MusicGeneratorForm>(DEFAULT_FORM);
    const [activeTab, setActiveTab] = useState<ActiveTab>('generate');
    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState<GeneratedSong[]>([]);
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        loadData().then((data) => {
            setApiKey(data.geminiApiKey ?? '');
        }).catch(() => {});
    }, []);

    function handleChipToggle(sectionId: string, chip: string) {
        if (ARRAY_KEYS.has(sectionId)) {
            const key = sectionId as FormArrayKey;
            const current = form[key] as string[];
            const section = MUSIC_CHIPS.find(s => s.id === sectionId);
            const isMulti = section?.multi ?? true;
            const next = isMulti
                ? current.includes(chip) ? current.filter(v => v !== chip) : [...current, chip]
                : current[0] === chip ? [] : [chip];
            setForm(prev => ({ ...prev, [key]: next }));
        } else {
            const key = sectionId as FormStringKey;
            const current = form[key] as string;
            setForm(prev => ({ ...prev, [key]: current === chip ? '' : chip }));
        }
    }

    function getSelected(sectionId: string): string[] {
        if (ARRAY_KEYS.has(sectionId)) {
            return form[sectionId as FormArrayKey] as string[];
        }
        const val = form[sectionId as FormStringKey] as string;
        return val ? [val] : [];
    }

    async function generate() {
        setIsGenerating(true);
        setResults([]);
        try {
            const res = await fetch('/api/music-generator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ form, apiKey }),
            });
            const data = (await res.json()) as { songs?: GeneratedSong[] };
            setResults(data.songs ?? []);
        } catch {
            setResults([]);
        } finally {
            setIsGenerating(false);
        }
    }

    const tabs: { id: ActiveTab; label: string }[] = [
        { id: 'generate', label: '🎵 음악 생성' },
        { id: 'cover', label: '🖼️ 커버 이미지' },
        { id: 'marketing', label: '📊 마케팅·분석' },
    ];

    return (
        <div className="page-content">
            <Header
                title="🎵 음악생성"
                subtitle="9개 섹션에서 옵션을 선택하면 AI가 10곡을 동시 생성합니다"
            />

            {/* 상단 컨트롤 바 */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginBottom: '20px',
                    padding: '12px 16px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                }}
            >
                {/* Shorts 모드 토글 */}
                <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, shortsMode: !prev.shortsMode }))}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: `1px solid ${form.shortsMode ? 'var(--accent)' : 'var(--border)'}`,
                        background: form.shortsMode ? 'rgba(229,62,62,0.15)' : 'transparent',
                        color: form.shortsMode ? 'var(--accent)' : 'var(--text-muted)',
                        fontSize: '13px',
                        fontWeight: form.shortsMode ? 700 : 400,
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                    }}
                >
                    ⚡ Shorts 모드 {form.shortsMode ? 'ON' : 'OFF'}
                </button>

                <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />

                {/* 모델 선택 */}
                <div style={{ display: 'flex', gap: '6px' }}>
                    {(['flash', 'pro'] as const).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, model: m }))}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '20px',
                                border: `1px solid ${form.model === m ? (m === 'flash' ? '#3b82f6' : '#f97316') : 'var(--border)'}`,
                                background: form.model === m ? (m === 'flash' ? 'rgba(59,130,246,0.15)' : 'rgba(249,115,22,0.15)') : 'transparent',
                                color: form.model === m ? (m === 'flash' ? '#60a5fa' : '#fb923c') : 'var(--text-muted)',
                                fontSize: '13px',
                                fontWeight: form.model === m ? 700 : 400,
                                cursor: 'pointer',
                                transition: 'var(--transition)',
                            }}
                        >
                            {m === 'flash' ? '🆓 Flash' : '🔥 Pro'}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => setForm(DEFAULT_FORM)}
                    className="btn btn-ghost btn-sm"
                    style={{ marginLeft: 'auto' }}
                >
                    초기화
                </button>
            </div>

            {/* 탭 네비게이션 */}
            <div
                style={{
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '20px',
                    borderBottom: '1px solid var(--border)',
                }}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '8px 8px 0 0',
                            border: 'none',
                            borderBottom: activeTab === tab.id
                                ? '2px solid var(--accent)'
                                : '2px solid transparent',
                            background: 'transparent',
                            color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                            fontSize: '13px',
                            fontWeight: activeTab === tab.id ? 700 : 400,
                            cursor: 'pointer',
                            transition: 'var(--transition)',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 음악 생성 탭 */}
            {activeTab === 'generate' && (
                <div>
                    <div className="info-banner" style={{ marginBottom: '20px' }}>
                        🎵 음악 스타일 및 옵션 선택 — 원하는 항목을 클릭하고{' '}
                        <strong>10곡 생성하기</strong>를 누르세요.
                        {form.shortsMode && (
                            <span style={{ marginLeft: '8px', color: 'var(--accent)', fontWeight: 700 }}>
                                ⚡ Shorts 모드: 가사 4줄 제한 적용
                            </span>
                        )}
                    </div>

                    {!apiKey && (
                        <div
                            className="info-banner"
                            style={{ marginBottom: '16px', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                        >
                            ⚠️ Gemini API 키가 없습니다. <a href="/settings" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>설정</a>에서 입력하세요.
                        </div>
                    )}

                    {/* ChipSelector 9개 섹션 */}
                    <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                        {MUSIC_CHIPS.map((section) => (
                            <ChipSelector
                                key={section.id}
                                label={section.label}
                                chips={section.chips}
                                selected={getSelected(section.id)}
                                onToggle={(chip) => handleChipToggle(section.id, chip)}
                                multi={section.multi}
                                placeholder="직접 입력 (Enter)"
                            />
                        ))}

                        {/* 자유 입력 (customRequest) */}
                        <div style={{ marginTop: '8px' }}>
                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>
                                ✍️ 추가 요청사항 (선택)
                            </label>
                            <textarea
                                className="form-textarea"
                                placeholder="원하는 주제, 가사 내용, 특별한 요청을 자유롭게 입력하세요..."
                                value={form.customRequest}
                                onChange={e => setForm(prev => ({ ...prev, customRequest: e.target.value }))}
                                style={{ minHeight: '80px', marginTop: '6px' }}
                            />
                        </div>
                    </div>

                    {/* 생성하기 버튼 */}
                    <button
                        type="button"
                        onClick={generate}
                        disabled={isGenerating || !apiKey}
                        style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: isGenerating || !apiKey
                                ? 'var(--bg-card)'
                                : 'linear-gradient(135deg, var(--accent) 0%, #fc5050 50%, #e91e8c 100%)',
                            color: isGenerating || !apiKey ? 'var(--text-muted)' : '#fff',
                            fontSize: '15px',
                            fontWeight: 700,
                            cursor: isGenerating || !apiKey ? 'not-allowed' : 'pointer',
                            marginBottom: '24px',
                            transition: 'var(--transition)',
                            boxShadow: isGenerating || !apiKey ? 'none' : 'var(--shadow-glow)',
                        }}
                    >
                        {isGenerating ? '⏳ 생성 중...' : '▶ 10곡 생성하기'}
                    </button>

                    {/* 로딩 스켈레톤 */}
                    {isGenerating && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="loading-pulse"
                                    style={{
                                        height: '56px',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--bg-card)',
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* 결과 카드 */}
                    {!isGenerating && results.length > 0 && (
                        <div>
                            <div
                                style={{
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    marginBottom: '12px',
                                }}
                            >
                                🎵 생성 결과 — {results.length}곡
                            </div>
                            {results.map((song, idx) => (
                                <SongResultCard key={idx} index={idx + 1} song={song} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 커버 이미지 탭 */}
            {activeTab === 'cover' && (
                <div className="empty-state">
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🖼️</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>커버 이미지 탭</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>추후 구현 예정 — AI 커버 아트 생성 기능</div>
                </div>
            )}

            {/* 마케팅·분석 탭 */}
            {activeTab === 'marketing' && (
                <div className="empty-state">
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>마케팅·분석 탭</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>추후 구현 예정 — 생성 통계 및 마케팅 인사이트</div>
                </div>
            )}
        </div>
    );
}
