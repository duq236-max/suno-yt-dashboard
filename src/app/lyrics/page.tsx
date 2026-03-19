'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import GenreSelector from '@/components/GenreSelector';
import MoodSelector from '@/components/MoodSelector';
import { CreativityPanel } from '@/components/CreativityPanel';
import {
    loadData,
    loadLyricsHistory,
    addLyricsHistory,
    deleteLyricsHistory,
    generateId,
    formatDatetime,
} from '@/lib/storage';
import { LyricsHistoryItem } from '@/types';

const LANG_OPTIONS: { value: LyricsHistoryItem['language']; label: string }[] = [
    { value: 'ko', label: '한국어' },
    { value: 'en', label: '영어' },
    { value: 'mixed', label: '한영 혼용' },
];

interface FormState {
    genre: string[];
    mood: string;
    theme: string;
    language: LyricsHistoryItem['language'];
    style: string;
    model: 'flash' | 'pro';
}

const DEFAULT_FORM: FormState = {
    genre: [],
    mood: '',
    theme: '',
    language: 'ko',
    style: '',
    model: 'flash',
};

export default function LyricsPage() {
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ title: string; lyrics: string; mood_tags: string[]; suno_style: string } | null>(null);
    const [history, setHistory] = useState<LyricsHistoryItem[]>([]);
    const [selectedHistory, setSelectedHistory] = useState<LyricsHistoryItem | null>(null);
    const [creativity, setCreativity] = useState<{ temperature: number; topP: number; topK: number }>({
        temperature: 0.7, topP: 0.9, topK: 30
    });
    const [copied, setCopied] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        setHistory(loadLyricsHistory());
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
            const res = await fetch('/api/gemini/lyrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey,
                    ...form,
                    genre: form.genre.join(', '),
                    creativityParams: creativity
                }),
            });

            const json = await res.json() as {
                error?: string;
                title?: string;
                lyrics?: string;
                mood_tags?: string[];
                suno_style?: string;
            };

            if (!res.ok) throw new Error(json.error ?? `API 오류 (${res.status})`);

            const generated = {
                title: json.title ?? '',
                lyrics: json.lyrics ?? '',
                mood_tags: json.mood_tags ?? [],
                suno_style: json.suno_style ?? '',
            };

            setResult(generated);

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

    const displayLyrics = selectedHistory?.lyrics ?? result?.lyrics ?? null;
    const displayTitle = selectedHistory?.title ?? result?.title ?? null;
    const displayMoodTags = selectedHistory ? [] : (result?.mood_tags ?? []);
    const displaySunoStyle = selectedHistory ? '' : (result?.suno_style ?? '');

    function showToast(message: string) {
        setToast(message);
        setTimeout(() => setToast(null), 3500);
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

                            {/* 분위기 */}
                            <div className="form-group">
                                <label className="form-label">분위기</label>
                                <MoodSelector value={form.mood} onChange={v => updateForm('mood', v)} />
                            </div>

                            {/* 주제 */}
                            <div className="form-group">
                                <label className="form-label">주제 / 테마 (선택)</label>
                                <input className="form-input" placeholder="예: 늦은 밤 카페, 비 오는 날, 새벽 드라이브" value={form.theme}
                                    onChange={e => updateForm('theme', e.target.value)} />
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
                                    <div className="card-title">📋 생성 히스토리 ({history.length})</div>
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
                                                border: `1.5px solid ${selectedHistory?.id === item.id ? 'var(--accent)' : 'var(--border)'}`,
                                                background: selectedHistory?.id === item.id ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {item.title}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        {item.genre} · {item.mood} · {formatDatetime(item.createdAt)}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleDeleteHistory(item.id); }}
                                                    style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                                                >🗑️</button>
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

                                        {/* Suno Style 힌트 */}
                                        {displaySunoStyle && (
                                            <div style={{
                                                marginBottom: '16px', padding: '10px 14px',
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
