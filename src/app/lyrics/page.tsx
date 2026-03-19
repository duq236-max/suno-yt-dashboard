'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import GenreSelector from '@/components/GenreSelector';
import MoodSelector from '@/components/MoodSelector';
import { CreativityPanel } from '@/components/CreativityPanel';
import CopyrightShield from '@/components/CopyrightShield';
import { vocalStyles } from '@/data/vocal-styles';
import {
    loadData,
    loadLyricsHistory,
    addLyricsHistory,
    deleteLyricsHistory,
    toggleLyricsHistoryStarred,
    getCustomVocals,
    saveCustomVocal,
    deleteCustomVocal,
    generateId,
    formatDatetime,
} from '@/lib/storage';
import { LyricsHistoryItem, CustomVocal } from '@/types';

const LANG_OPTIONS: { value: LyricsHistoryItem['language']; label: string }[] = [
    { value: 'ko', label: '한국어' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'zh', label: '中文' },
];

interface FormState {
    genre: string[];
    mood: string;
    theme: string;
    language: LyricsHistoryItem['language'];
    style: string;
    model: 'flash' | 'pro';
    copyrightDefense: boolean;
    vocalStyleId: string;
    shortForm: boolean;
}

const DEFAULT_FORM: FormState = {
    genre: [],
    mood: '',
    theme: '',
    language: 'ko',
    style: '',
    model: 'flash',
    copyrightDefense: false,
    vocalStyleId: '',
    shortForm: false,
};

export default function LyricsPage() {
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ title: string; lyrics: string; mood_tags: string[]; suno_style: string; suno_prompt: string } | null>(null);
    const [history, setHistory] = useState<LyricsHistoryItem[]>([]);
    const [selectedHistory, setSelectedHistory] = useState<LyricsHistoryItem | null>(null);
    const [creativity, setCreativity] = useState<{ temperature: number; topP: number; topK: number }>({
        temperature: 0.7, topP: 0.9, topK: 30
    });
    const [copied, setCopied] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [customVocals, setCustomVocals] = useState<CustomVocal[]>([]);
    const [vocalRecommending, setVocalRecommending] = useState(false);
    const [vocalRecommendReason, setVocalRecommendReason] = useState<string | null>(null);
    const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);

    useEffect(() => {
        setHistory(loadLyricsHistory());
        setCustomVocals(getCustomVocals());
    }, []);

    function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm(prev => ({ ...prev, [key]: value }));
    }

    async function handleGenerate() {
        const apiKey = loadData().geminiApiKey;
        if (!apiKey) {
            setError('먼저 설정 페이지에서 Gemini API 키를 입력해주세요.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const selectedVocal = vocalStyles.find(v => v.id === form.vocalStyleId);
            const vocalKeywords = selectedVocal ? selectedVocal.sunoKeywords.join(', ') : '';

            const res = await fetch('/api/gemini/lyrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey,
                    ...form,
                    genre: form.genre.join(', '),
                    creativityParams: creativity,
                    copyrightDefense: form.copyrightDefense,
                    vocalKeywords,
                    shortForm: form.shortForm,
                }),
            });

            const json = await res.json() as {
                error?: string;
                title?: string;
                lyrics?: string;
                mood_tags?: string[];
                suno_style?: string;
                suno_prompt?: string;
            };

            if (!res.ok) throw new Error(json.error ?? `API 오류 (${res.status})`);

            const generated = {
                title: json.title ?? '',
                lyrics: json.lyrics ?? '',
                mood_tags: json.mood_tags ?? [],
                suno_style: json.suno_style ?? '',
                suno_prompt: json.suno_prompt ?? json.suno_style ?? '',
            };

            setResult(generated);

            // 예상 재생시간 추정 (J5): 한국어 기준 ~3글자/초, 영어 ~1.5단어/초
            const charCount = generated.lyrics.replace(/\[.+?\]|\n/g, '').length;
            const charsPerSec = form.language === 'en' ? 8 : 5;
            setEstimatedDuration(Math.round(charCount / charsPerSec));

            // 히스토리 저장
            const historyItem: LyricsHistoryItem = {
                id: generateId(),
                title: generated.title,
                genre: form.genre.join(', '),
                mood: form.mood,
                theme: form.theme,
                language: form.language,
                style: form.style,
                lyrics: generated.lyrics,
                suno_prompt: generated.suno_prompt || undefined,
                model: form.model,
                createdAt: new Date().toISOString(),
            };
            setHistory(addLyricsHistory(historyItem));
        } catch (err) {
            setError(err instanceof Error ? err.message : '알 수 없는 오류');
        } finally {
            setLoading(false);
        }
    }

    function handleCopy(text: string) {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => { });
    }

    function handleDeleteHistory(id: string) {
        if (!confirm('이 가사를 히스토리에서 삭제할까요?')) return;
        setHistory(deleteLyricsHistory(id));
        if (selectedHistory?.id === id) setSelectedHistory(null);
    }

    function handleStarHistory(e: React.MouseEvent, id: string) {
        e.stopPropagation();
        const updated = toggleLyricsHistoryStarred(id);
        setHistory(updated);
        if (selectedHistory?.id === id) {
            const found = updated.find(i => i.id === id);
            if (found) setSelectedHistory(found);
        }
    }

    function handleLoadHistory(item: LyricsHistoryItem) {
        setForm(prev => ({
            ...prev,
            genre: item.genre ? item.genre.split(', ').filter(Boolean) : prev.genre,
            mood: item.mood || prev.mood,
            theme: item.theme || prev.theme,
            language: item.language,
            style: item.style || prev.style,
        }));
        setSelectedHistory(item);
        showToast(`📂 "${item.title}" 설정을 폼에 불러왔습니다.`);
    }

    const displayLyrics = selectedHistory?.lyrics ?? result?.lyrics ?? null;
    const displayTitle = selectedHistory?.title ?? result?.title ?? null;
    const displayMoodTags = selectedHistory ? [] : (result?.mood_tags ?? []);
    const displaySunoStyle = selectedHistory ? '' : (result?.suno_style ?? '');
    const displaySunoPrompt = selectedHistory?.suno_prompt ?? result?.suno_prompt ?? '';

    function showToast(message: string) {
        setToast(message);
        setTimeout(() => setToast(null), 3500);
    }

    function handleSaveCustomVocal() {
        if (!form.vocalStyleId) { showToast('먼저 보컬 스타일을 선택해주세요.'); return; }
        const vocal = vocalStyles.find(v => v.id === form.vocalStyleId);
        if (!vocal) return;
        const entry: CustomVocal = {
            id: generateId(),
            name: vocal.name,
            vocalStyleId: form.vocalStyleId,
            genre: form.genre.join(', '),
            mood: form.mood,
            createdAt: new Date().toISOString(),
        };
        setCustomVocals(saveCustomVocal(entry));
        showToast(`💾 "${vocal.name}" 커스텀 보컬이 저장됐어요.`);
    }

    function handleDeleteCustomVocal(id: string) {
        setCustomVocals(deleteCustomVocal(id));
    }

    async function handleRecommendVocal() {
        const apiKey = loadData().geminiApiKey;
        if (!apiKey) { showToast('Gemini API 키를 먼저 설정해주세요.'); return; }
        if (form.genre.length === 0) { showToast('장르를 먼저 선택해주세요.'); return; }
        setVocalRecommending(true);
        setVocalRecommendReason(null);
        try {
            const res = await fetch('/api/gemini/vocal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, genre: form.genre.join(', '), mood: form.mood }),
            });
            const json = await res.json() as { id?: string; name?: string; reason?: string; error?: string };
            if (!res.ok) throw new Error(json.error ?? 'API 오류');
            if (json.id) {
                updateForm('vocalStyleId', json.id);
                setVocalRecommendReason(json.reason ?? null);
            }
        } catch (err) {
            showToast(err instanceof Error ? err.message : '추천 실패');
        } finally {
            setVocalRecommending(false);
        }
    }

    function handleSendToSuno() {
        type ChromeWindow = Window & { chrome?: { runtime?: { id?: string } } };
        const hasChromeRuntime = typeof window !== 'undefined' &&
            'chrome' in window &&
            !!(window as ChromeWindow).chrome?.runtime?.id;

        if (!hasChromeRuntime) {
            showToast('Extension이 설치되지 않았습니다. Chrome 웹스토어에서 설치해주세요.');
            return;
        }

        window.dispatchEvent(new CustomEvent('SUNO_YT_INJECT_EVENT', {
            detail: {
                lyrics: displayLyrics ?? '',
                prompt: displaySunoStyle,
                title: displayTitle ?? '',
                timestamp: Date.now(),
            },
        }));
    }

    return (
        <>
            <Header title="AI 가사 생성" subtitle="Gemini AI로 Suno 최적화 가사를 자동 생성합니다" />
            <div className="page-content">

                <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', alignItems: 'start' }}>

                    {/* ─── 왼쪽: 생성 폼 ─── */}
                    <div>
                        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                            <div className="card-header" style={{ marginBottom: '16px' }}>
                                <div className="card-title">✍️ 가사 생성 설정</div>
                            </div>

                            {/* Shorts 모드 (J5) */}
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={form.shortForm}
                                        onChange={e => updateForm('shortForm', e.target.checked)}
                                    />
                                    <span style={{ fontSize: '13px', fontWeight: 600 }}>
                                        ⚡ Shorts 모드 (30~60초)
                                        <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                                            4줄·강렬한 훅
                                        </span>
                                    </span>
                                </label>
                            </div>

                            {/* 모델 선택 */}
                            <div className="form-group">
                                <label className="form-label">AI 모델</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {(['flash', 'pro'] as const).map(m => (
                                        <button
                                            key={m}
                                            onClick={() => updateForm('model', m)}
                                            style={{
                                                flex: 1, padding: '8px 12px', borderRadius: '8px',
                                                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                                border: `1.5px solid ${form.model === m ? 'var(--accent)' : 'var(--border)'}`,
                                                background: form.model === m ? 'var(--accent-dim)' : 'transparent',
                                                color: form.model === m ? 'var(--accent)' : 'var(--text-muted)',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            {m === 'flash' ? '🆓 Flash (무료)' : '🔥 Pro (유료)'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 장르 */}
                            <div className="form-group">
                                <label className="form-label">장르 (다중선택)</label>
                                <GenreSelector value={form.genre} onChange={v => updateForm('genre', v)} />
                            </div>

                            {/* 보컬 스타일 (H2 + H3 + H4) */}
                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label className="form-label" style={{ margin: 0 }}>보컬 스타일 (선택)</label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {form.genre.length > 0 && (
                                            <button
                                                onClick={handleRecommendVocal}
                                                disabled={vocalRecommending}
                                                style={{
                                                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                                    cursor: vocalRecommending ? 'not-allowed' : 'pointer',
                                                    border: '1px solid var(--accent)', background: 'var(--accent-dim)',
                                                    color: 'var(--accent)', opacity: vocalRecommending ? 0.6 : 1,
                                                }}
                                            >
                                                {vocalRecommending ? '⏳ 추천 중...' : '🤖 보컬 자동 추천'}
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSaveCustomVocal}
                                            style={{
                                                padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                                cursor: 'pointer',
                                                border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                                color: 'var(--text-muted)',
                                            }}
                                        >💾 이 보컬 저장</button>
                                    </div>
                                </div>

                                {vocalRecommendReason && (
                                    <div style={{
                                        marginBottom: '8px', padding: '8px 12px',
                                        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                                        borderRadius: '8px', fontSize: '11px', color: '#a5b4fc',
                                    }}>
                                        🤖 {vocalRecommendReason}
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {vocalStyles.map(vs => (
                                        <button
                                            key={vs.id}
                                            onClick={() => updateForm('vocalStyleId', form.vocalStyleId === vs.id ? '' : vs.id)}
                                            style={{
                                                padding: '8px 12px', borderRadius: '8px', fontSize: '12px',
                                                fontWeight: form.vocalStyleId === vs.id ? 700 : 500,
                                                cursor: 'pointer', textAlign: 'left',
                                                border: `1.5px solid ${form.vocalStyleId === vs.id ? 'var(--accent)' : 'var(--border)'}`,
                                                background: form.vocalStyleId === vs.id ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                                                color: form.vocalStyleId === vs.id ? 'var(--accent)' : 'var(--text-secondary)',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            <span style={{ fontWeight: 700 }}>{vs.name}</span>
                                            <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontSize: '11px' }}>{vs.description}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* 저장된 커스텀 보컬 프리셋 (H3) */}
                                {customVocals.length > 0 && (
                                    <div style={{ marginTop: '10px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                                            💾 저장된 커스텀 보컬 ({customVocals.length}/5)
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {customVocals.map(cv => (
                                                <div
                                                    key={cv.id}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '6px 10px', borderRadius: '6px',
                                                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                                        fontSize: '11px',
                                                    }}
                                                >
                                                    <button
                                                        onClick={() => updateForm('vocalStyleId', cv.vocalStyleId)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', flex: 1 }}
                                                    >
                                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{cv.name}</span>
                                                        {cv.genre && <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>{cv.genre}</span>}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCustomVocal(cv.id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)', marginLeft: '4px' }}
                                                    >🗑️</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 저작권 방어 경고 (G1·G2) */}
                            <CopyrightShield text={[form.genre.join(' '), form.style, form.theme].join(' ')} />

                            {/* 분위기 */}
                            <div className="form-group">
                                <label className="form-label">분위기</label>
                                <MoodSelector value={form.mood} onChange={v => updateForm('mood', v)} />
                            </div>

                            {/* 주제 */}
                            <div className="form-group">
                                <label className="form-label">주제 / 테마 (선택)</label>
                                <input
                                    className="form-input"
                                    placeholder={form.shortForm
                                        ? '예: 강렬한 훅으로 시작하는 이별, 오늘 밤만큼은...'
                                        : '예: 늦은 밤 카페, 비 오는 날, 새벽 드라이브'}
                                    value={form.theme}
                                    onChange={e => updateForm('theme', e.target.value)}
                                />
                            </div>

                            {/* 언어 */}
                            <div className="form-group">
                                <label className="form-label">가사 언어</label>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {LANG_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateForm('language', opt.value)}
                                            style={{
                                                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                                cursor: 'pointer',
                                                border: `1.5px solid ${form.language === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                                                background: form.language === opt.value ? 'var(--accent-dim)' : 'transparent',
                                                color: form.language === opt.value ? 'var(--accent)' : 'var(--text-muted)',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >{opt.label}</button>
                                    ))}
                                </div>
                            </div>

                            {/* 스타일 */}
                            <div className="form-group">
                                <label className="form-label">추가 스타일 지시 (선택)</label>
                                <input className="form-input" placeholder="예: 서정적, 단어 반복 강조, 짧은 문장" value={form.style}
                                    onChange={e => updateForm('style', e.target.value)} />
                            </div>

                            {/* 저작권 방어 */}
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={form.copyrightDefense}
                                        onChange={e => updateForm('copyrightDefense', e.target.checked)}
                                    />
                                    <span style={{ fontSize: '13px' }}>
                                        🛡️ 저작권 방어 키워드 자동 삽입
                                        <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
                                            (No Choir · No Background Vocals · No Musical Theater Style · Straight Voice)
                                        </span>
                                    </span>
                                </label>
                            </div>

                            <CreativityPanel value={creativity} onChange={setCreativity} />

                            {/* 에러 */}
                            {error && (
                                <div style={{
                                    padding: '10px 14px', marginBottom: '12px',
                                    background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.3)',
                                    borderRadius: '8px', fontSize: '12px', color: '#f87171',
                                }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
                                onClick={handleGenerate}
                                disabled={loading || form.genre.length === 0 || !form.mood}
                            >
                                {loading
                                    ? '⏳ 가사 생성 중...'
                                    : (form.model === 'flash' ? '🆓 Flash로 가사 생성' : '🔥 Pro로 가사 생성')}
                            </button>
                        </div>

                        {/* ─── 히스토리 목록 ─── */}
                        {history.length > 0 && (
                            <div className="card" style={{ padding: '16px' }}>
                                <div className="card-header" style={{ marginBottom: '12px' }}>
                                    <div className="card-title">
                                        📋 생성 히스토리 ({history.length})
                                        {history.some(i => i.starred) && (
                                            <span style={{ marginLeft: '6px', fontSize: '11px', color: '#fbbf24' }}>
                                                ★ {history.filter(i => i.starred).length}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setSelectedHistory(null)}
                                        style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >초기화</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
                                    {history.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => setSelectedHistory(item)}
                                            style={{
                                                padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                                                border: `1.5px solid ${selectedHistory?.id === item.id ? 'var(--accent)' : item.starred ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
                                                background: selectedHistory?.id === item.id ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {item.starred && <span style={{ color: '#fbbf24', marginRight: '4px' }}>★</span>}
                                                        {item.title}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        {item.genre} · {item.mood} · {formatDatetime(item.createdAt)}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '2px', marginLeft: '8px', flexShrink: 0 }}>
                                                    <button
                                                        onClick={e => handleStarHistory(e, item.id)}
                                                        title={item.starred ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                                                        style={{
                                                            fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer',
                                                            color: item.starred ? '#fbbf24' : 'var(--text-muted)',
                                                            opacity: item.starred ? 1 : 0.5,
                                                        }}
                                                    >{item.starred ? '★' : '☆'}</button>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleLoadHistory(item); }}
                                                        title="폼에 불러오기"
                                                        style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                    >📥</button>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleDeleteHistory(item.id); }}
                                                        title="삭제"
                                                        style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                    >🗑️</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─── 오른쪽: 결과 / 히스토리 상세 ─── */}
                    <div>
                        {(displayLyrics || loading) ? (
                            <div className="card" style={{ padding: '24px' }}>
                                {loading ? (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">⏳</div>
                                        <div className="empty-state-title">가사를 생성하고 있습니다...</div>
                                        <div className="empty-state-desc">Gemini AI가 곡의 스토리를 쓰는 중이에요</div>
                                    </div>
                                ) : (
                                    <>
                                        {/* 제목 + 복사 버튼 */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                                            <div>
                                                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{displayTitle}</div>
                                                {displayMoodTags.length > 0 && (
                                                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
                                                        {displayMoodTags.map(tag => (
                                                            <span key={tag} style={{
                                                                fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
                                                                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                                                color: 'var(--text-secondary)',
                                                            }}>{tag}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ background: copied ? 'rgba(34,197,94,0.15)' : undefined, borderColor: copied ? '#22c55e' : undefined, color: copied ? '#22c55e' : undefined }}
                                                    onClick={() => handleCopy(displayLyrics ?? '')}
                                                >
                                                    {copied ? '✅ 복사됨!' : '📋 가사 복사'}
                                                </button>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={handleSendToSuno}
                                                >
                                                    🚀 Suno로 전송
                                                </button>
                                            </div>
                                        </div>

                                        {/* 예상 재생시간 (J5) */}
                                        {estimatedDuration !== null && !selectedHistory && (
                                            <div style={{
                                                marginBottom: '12px', padding: '8px 14px',
                                                background: form.shortForm
                                                    ? 'rgba(234,179,8,0.1)'
                                                    : 'rgba(34,197,94,0.08)',
                                                border: `1px solid ${form.shortForm ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.2)'}`,
                                                borderRadius: '8px', fontSize: '12px',
                                                color: form.shortForm ? '#fde047' : '#86efac',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                            }}>
                                                {form.shortForm ? '⚡' : '🕐'}
                                                예상 재생시간: 약 <strong>{estimatedDuration}초</strong>
                                                {form.shortForm && estimatedDuration > 60 && (
                                                    <span style={{ color: '#f87171', marginLeft: '4px' }}>— Shorts 한도 초과!</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Suno Style 힌트 */}
                                        {displaySunoStyle && (
                                            <div style={{
                                                marginBottom: '12px', padding: '10px 14px',
                                                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                                                borderRadius: '8px', fontSize: '12px', color: '#a5b4fc',
                                            }}>
                                                <span style={{ color: '#818cf8', fontWeight: 600 }}>Suno Style: </span>{displaySunoStyle}
                                                <button
                                                    onClick={() => handleCopy(displaySunoStyle)}
                                                    style={{ marginLeft: '8px', fontSize: '11px', color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer' }}
                                                >복사</button>
                                            </div>
                                        )}

                                        {/* Suno 프롬프트 (C6) */}
                                        {displaySunoPrompt && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                                                    🎯 Suno 프롬프트 (복사 후 Suno 스타일 입력창에 붙여넣기)
                                                </div>
                                                <div style={{
                                                    padding: '12px 14px',
                                                    background: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    color: 'var(--text-primary)',
                                                    fontFamily: 'monospace',
                                                    lineHeight: 1.6,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    gap: '10px',
                                                }}>
                                                    <span style={{ flex: 1, wordBreak: 'break-word' }}>{displaySunoPrompt}</span>
                                                    <button
                                                        onClick={() => handleCopy(displaySunoPrompt)}
                                                        style={{
                                                            flexShrink: 0, padding: '4px 10px', borderRadius: '6px',
                                                            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                                            border: '1px solid var(--border)',
                                                            background: 'var(--bg-card)',
                                                            color: 'var(--text-secondary)',
                                                        }}
                                                    >복사</button>
                                                </div>
                                            </div>
                                        )}

                                        {/* 가사 본문 */}
                                        <pre style={{
                                            fontFamily: 'inherit', fontSize: '14px', lineHeight: 2,
                                            color: 'var(--text-primary)', whiteSpace: 'pre-wrap',
                                            background: 'var(--bg-secondary)', borderRadius: '10px',
                                            padding: '20px', margin: 0,
                                            border: '1px solid var(--border)',
                                        }}>
                                            {(displayLyrics ?? '').split('\n').map((line, i) => {
                                                const isSection = /^\[.+\]$/.test(line.trim());
                                                return (
                                                    <span key={i} style={isSection ? { color: 'var(--accent)', fontWeight: 700, display: 'block', marginTop: i > 0 ? '8px' : 0 } : { display: 'block' }}>
                                                        {line || '\u00A0'}
                                                    </span>
                                                );
                                            })}
                                        </pre>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="card">
                                <div className="empty-state">
                                    <div className="empty-state-icon">🎼</div>
                                    <div className="empty-state-title">가사를 생성해보세요</div>
                                    <div className="empty-state-desc">
                                        왼쪽에서 장르·분위기·주제를 설정하고<br />
                                        AI 생성 버튼을 누르면 Suno 최적화 가사가 만들어집니다
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                    padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                    background: 'rgba(229,62,62,0.15)', border: '1px solid rgba(229,62,62,0.4)',
                    color: '#fca5a5', zIndex: 9999, pointerEvents: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}>
                    ⚠️ {toast}
                </div>
            )}
        </>
    );
}
