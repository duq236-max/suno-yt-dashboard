'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import ChipSelector from '@/components/ChipSelector';
import SongResultCard from '@/components/SongResultCard';
import SaveToSheetModal from '@/components/SaveToSheetModal';
import { MUSIC_CHIPS } from '@/data/music-chips';
import type { MusicGeneratorForm, GeneratedSong, MusicGenHistory } from '@/types/music-generator';
import { loadData, saveMusicGenHistory, loadMusicGenHistory, generateId } from '@/lib/supabase-storage';
import styles from './page.module.css';

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
    atmosphere: [],
    production: [],
    creativity: '',
    customRequest: '',
    shortsMode: false,
    model: 'flash',
    count: 5,
};

/** 섹션 id → MusicGeneratorForm 키 매핑. 단일값 섹션은 string, 다중값은 string[] */
type FormArrayKey = 'genres' | 'moods' | 'vocals' | 'usage' | 'instruments' | 'theme' | 'atmosphere' | 'production';
type FormStringKey = 'bpm' | 'targetAge' | 'language' | 'creativity';
const ARRAY_KEYS = new Set<string>(['genres', 'moods', 'vocals', 'usage', 'instruments', 'theme', 'atmosphere', 'production']);

const SUNO_SEND_TYPE = 'SUNO_BATCH_SEND';

export default function MusicGeneratorPage() {
    const [form, setForm] = useState<MusicGeneratorForm>(DEFAULT_FORM);
    const [activeTab, setActiveTab] = useState<ActiveTab>('generate');
    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState<GeneratedSong[]>([]);
    const resultsRef = useRef<HTMLDivElement>(null);
    const [apiKey, setApiKey] = useState('');

    // 모달 / Toast / 이력
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [history, setHistory] = useState<MusicGenHistory[]>([]);

    useEffect(() => {
        loadData().then((data) => {
            setApiKey(data.geminiApiKey ?? '');
        }).catch(() => {});
    }, []);

    // 이력 로드
    useEffect(() => {
        loadMusicGenHistory().then(setHistory).catch(() => {});
    }, []);

    // Toast 자동 해제 (2초)
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 2000);
        return () => clearTimeout(timer);
    }, [toast]);

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

    async function generate(sheetId?: string, openSuno?: boolean) {
        setIsGenerating(true);
        setResults([]);
        try {
            const res = await fetch('/api/music-generator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ form, apiKey }),
            });
            const data = (await res.json()) as { songs?: GeneratedSong[]; error?: string };
            if (!res.ok || data.error) {
                setToast('❌ ' + (data.error ?? '생성 오류'));
                return;
            }
            const songs = data.songs ?? [];
            setResults(songs);

            // 이력 저장
            if (songs.length > 0) {
                const record: MusicGenHistory = {
                    id: generateId(),
                    createdAt: new Date().toISOString(),
                    form,
                    songs,
                };
                await saveMusicGenHistory(record);

                // 이력 패널 갱신
                const updated = await loadMusicGenHistory();
                setHistory(updated);

                // Toast
                const genreLabel = form.genres[0] ?? '음악';
                const sheetLabel = sheetId ? ' 시트에 저장됨' : '';
                setToast(`✅ ${genreLabel} ${songs.length}곡 생성 완료${sheetLabel}`);
                resultsRef.current?.scrollIntoView({ behavior: 'smooth' });

                // Suno 열기 (Extension 전송)
                if (openSuno) {
                    window.postMessage({ type: SUNO_SEND_TYPE, songs }, '*');
                    window.open('https://suno.com', '_blank', 'noopener');
                }
            }
        } catch {
            setResults([]);
            setToast('❌ 생성 중 오류가 발생했습니다');
        } finally {
            setIsGenerating(false);
        }
    }

    /** SaveToSheetModal onConfirm 핸들러 — 결과 저장 후 Suno 열기 */
    async function handleSaveConfirm(sheetId: string, openSuno: boolean) {
        setShowSaveModal(false);
        setToast('✅ 시트에 저장되었습니다');
        if (openSuno && results.length > 0) {
            window.postMessage({ type: SUNO_SEND_TYPE, songs: results }, '*');
            window.open('https://suno.com', '_blank', 'noopener');
        }
    }

    /** SongResultCard — Suno 전송 핸들러 */
    function handleSendToSuno(song: GeneratedSong) {
        window.postMessage({ type: SUNO_SEND_TYPE, songs: [song] }, '*');
        window.open('https://suno.com', '_blank', 'noopener');
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
                className={styles.tabBar}
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
                    <div className={`card ${styles.chipCard}`} style={{ padding: '20px', marginBottom: '16px' }}>
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

                    {/* 곡 수 선택 */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '12px',
                            padding: '12px 16px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                        }}
                    >
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0 }}>몇 곡 생성?</span>
                        <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                            {[1, 3, 5, 10].map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, count: n }))}
                                    style={{
                                        flex: 1,
                                        padding: '8px 0',
                                        borderRadius: '10px',
                                        border: `1px solid ${form.count === n ? 'var(--accent)' : 'var(--border)'}`,
                                        background: form.count === n ? 'rgba(229,62,62,0.18)' : 'transparent',
                                        color: form.count === n ? 'var(--accent)' : 'var(--text-muted)',
                                        fontSize: '14px',
                                        fontWeight: form.count === n ? 700 : 400,
                                        cursor: 'pointer',
                                        transition: 'var(--transition)',
                                    }}
                                >
                                    {n}곡
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 생성하기 버튼 → 바로 생성 */}
                    <button
                        type="button"
                        onClick={() => generate()}
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
                        {isGenerating ? '⏳ 생성 중...' : `▶ ${form.count}곡 생성하기`}
                    </button>

                    {/* 로딩 스켈레톤 */}
                    {isGenerating && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {Array.from({ length: form.count }).map((_, i) => (
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
                        <div ref={resultsRef} className={styles.outputSection}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '12px',
                                }}
                            >
                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                                    🎵 생성 결과 — {results.length}곡
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowSaveModal(true)}
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(229,62,62,0.4)',
                                        background: 'rgba(229,62,62,0.12)',
                                        color: 'var(--accent)',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    💾 저장하기
                                </button>
                            </div>
                            {results.map((song, idx) => (
                                <SongResultCard
                                    key={idx}
                                    index={idx + 1}
                                    song={song}
                                    onSendToSuno={handleSendToSuno}
                                />
                            ))}
                        </div>
                    )}

                    {/* 이력 패널 (최근 3개) */}
                    {history.length > 0 && (
                        <div style={{ marginTop: '32px' }}>
                            <div
                                style={{
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    marginBottom: '12px',
                                }}
                            >
                                🕐 최근 생성 이력
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {history.slice(0, 3).map((item) => {
                                    const genres = item.form.genres?.join(', ') || '(장르 없음)';
                                    const date = new Date(item.createdAt).toLocaleDateString('ko-KR', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    });
                                    return (
                                        <div
                                            key={item.id}
                                            className="card"
                                            style={{
                                                padding: '12px 16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                            }}
                                        >
                                            <span style={{ fontSize: '20px', flexShrink: 0 }}>🎵</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        color: 'var(--text-primary)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {genres}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    {date} · {item.songs.length}곡
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 커버 이미지 탭 */}
            {activeTab === 'cover' && (
                <div>
                    {results.length === 0 ? (
                        <div className="empty-state">
                            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🖼️</div>
                            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>먼저 음악을 생성하세요</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                음악 생성 탭에서 곡을 생성하면 커버 이미지를 만들 수 있습니다
                            </div>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: '24px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>
                                🖼️ 생성된 곡에 맞는 커버 이미지 만들기
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
                                <strong style={{ color: 'var(--text-primary)' }}>{results[0]?.title}</strong> 외{' '}
                                {results.length - 1}곡이 생성되었습니다.<br />
                                장르: <strong style={{ color: 'var(--text-primary)' }}>{form.genres[0] ?? '(미선택)'}</strong>
                                {form.moods[0] && (
                                    <> · 분위기: <strong style={{ color: 'var(--text-primary)' }}>{form.moods[0]}</strong></>
                                )}
                            </div>
                            <a
                                href={`/cover-image-generator?title=${encodeURIComponent(results[0]?.title ?? '')}&genre=${encodeURIComponent(form.genres[0] ?? '')}`}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 20px',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    transition: 'var(--transition)',
                                }}
                            >
                                🎨 커버 이미지 생성기 열기
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* 마케팅·분석 탭 */}
            {activeTab === 'marketing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* 장르·스타일 요약 */}
                    <div className="card" style={{ padding: '20px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>📊 선택한 스타일 요약</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {[
                                ...form.genres.map(v => ({ label: v, color: '#3b82f6' })),
                                ...form.moods.map(v => ({ label: v, color: '#8b5cf6' })),
                                ...form.theme.map(v => ({ label: v, color: '#10b981' })),
                                ...form.atmosphere.map(v => ({ label: v, color: '#f59e0b' })),
                            ].length === 0 ? (
                                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                    음악 생성 탭에서 스타일을 선택하면 요약이 표시됩니다
                                </span>
                            ) : (
                                [
                                    ...form.genres.map(v => ({ label: v, color: '#3b82f6' })),
                                    ...form.moods.map(v => ({ label: v, color: '#8b5cf6' })),
                                    ...form.theme.map(v => ({ label: v, color: '#10b981' })),
                                    ...form.atmosphere.map(v => ({ label: v, color: '#f59e0b' })),
                                ].map((item, i) => (
                                    <span
                                        key={i}
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            background: `${item.color}22`,
                                            color: item.color,
                                            border: `1px solid ${item.color}44`,
                                        }}
                                    >
                                        {item.label}
                                    </span>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 업로드 최적 시간 카드 */}
                    <div className="card" style={{ padding: '20px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>⏰ 업로드 최적 시간</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                { day: '월~금', time: '오후 6~9시', reason: '직장인 퇴근 후 피크 타임' },
                                { day: '토·일', time: '오전 10시~오후 2시', reason: '주말 오전 여유 시간' },
                                { day: '쇼츠', time: '오전 7~9시', reason: '출근길 모바일 사용 증가' },
                            ].map((slot) => (
                                <div
                                    key={slot.day}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        background: 'var(--bg-secondary)',
                                    }}
                                >
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', minWidth: '40px' }}>
                                        {slot.day}
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {slot.time}
                                    </span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{slot.reason}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SEO 패키지 바로가기 */}
                    <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>🔍 SEO 패키지로 이동</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                제목·태그·설명을 AI가 자동 생성해 YouTube 노출을 극대화하세요
                            </div>
                        </div>
                        <a
                            href="/seo-package"
                            style={{
                                padding: '8px 18px',
                                borderRadius: 'var(--radius-md)',
                                background: 'rgba(229,62,62,0.15)',
                                border: '1px solid rgba(229,62,62,0.4)',
                                color: 'var(--accent)',
                                fontSize: '13px',
                                fontWeight: 700,
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                                transition: 'var(--transition)',
                            }}
                        >
                            SEO 패키지 →
                        </a>
                    </div>
                </div>
            )}

            {/* SaveToSheetModal */}
            <SaveToSheetModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onConfirm={handleSaveConfirm}
            />

            {/* Toast (하단 고정, 2초 표시) */}
            {toast && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '12px 20px',
                        borderRadius: '10px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        zIndex: 9999,
                        whiteSpace: 'nowrap',
                        animation: 'toast-in 0.2s ease',
                    }}
                >
                    {toast}
                    <style>{`
                        @keyframes toast-in {
                            from { opacity: 0; transform: translateX(-50%) translateY(8px); }
                            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
