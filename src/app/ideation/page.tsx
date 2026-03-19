'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { CreativityPanel } from '@/components/CreativityPanel';
import { loadData, loadData as loadStorage, generateId, updateSheets } from '@/lib/storage';
import type { IdeaCard } from '@/app/api/gemini/ideation/route';

const GENRES = ['Lo-fi Hip-hop', 'Jazz', 'Classical Piano', 'Ambient', 'EDM', 'Chillhop', '수면 음악', '카페 BGM', '명상 음악', 'Nature Sounds'];
const MOODS = ['집중', '릴렉스', '감성', '에너지틱', '몽환적', '따뜻함', '새벽감성', '청량함'];

type GenerateState = 'idle' | 'loading' | 'done' | 'error';

export default function IdeationPage() {
    const [apiKey, setApiKey] = useState('');
    const [brandContext, setBrandContext] = useState('');
    const [genre, setGenre] = useState('');
    const [mood, setMood] = useState('');
    const [model, setModel] = useState<'flash' | 'pro'>('flash');
    const [state, setState] = useState<GenerateState>('idle');
    const [ideas, setIdeas] = useState<IdeaCard[]>([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const [creativity, setCreativity] = useState({ temperature: 0.7, topP: 0.9, topK: 30 });

    useEffect(() => {
        const data = loadStorage();
        setApiKey(data.geminiApiKey ?? '');
        // BrandKit 컨텍스트 자동 주입
        if (data.brandKit) {
            const bk = data.brandKit;
            const parts: string[] = [];
            if (bk.channelName) parts.push(`채널명: ${bk.channelName}`);
            if (bk.primaryGenre) parts.push(`장르: ${bk.primaryGenre}`);
            if (bk.targetAudience) parts.push(`타겟: ${bk.targetAudience}`);
            if (bk.moodKeywords?.length) parts.push(`무드: ${bk.moodKeywords.slice(0, 3).join('·')}`);
            setBrandContext(parts.join(', '));
        }
    }, []);

    async function handleGenerate() {
        if (!apiKey) { setErrorMsg('설정 페이지에서 Gemini API 키를 먼저 입력하세요.'); setState('error'); return; }
        if (!genre || !mood) { setErrorMsg('장르와 분위기를 선택하세요.'); setState('error'); return; }

        setState('loading');
        setErrorMsg('');
        setIdeas([]);
        setExpandedIdx(null);
        setSavedIds(new Set());

        try {
            const res = await fetch('/api/gemini/ideation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, model, genre, mood, brandContext, creativityParams: creativity }),
            });

            const json = await res.json() as { ideas?: IdeaCard[]; error?: string };

            if (!res.ok || json.error) {
                throw new Error(json.error ?? '알 수 없는 오류');
            }

            setIdeas(json.ideas ?? []);
            setState('done');
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
            setState('error');
        }
    }

    function handleSaveToScrapSheet(idea: IdeaCard, idx: number) {
        const data = loadData();
        const defaultSheet = data.sheets[0];

        const newItem = {
            id: generateId(),
            title: idea.title,
            prompt: idea.suno_prompt,
            lyrics: '',
            genre: genre,
            status: 'unused' as const,
            mood_tags: idea.tags.map(t => t.replace('#', '')),
            is_instrumental: true,
            createdAt: new Date().toISOString(),
            notes: `[Ideation] ${idea.concept}\n썸네일: ${idea.thumbnail_concept}`,
        };

        if (defaultSheet) {
            const updatedSheet = { ...defaultSheet, items: [...defaultSheet.items, newItem] };
            const updatedSheets = data.sheets.map(s => s.id === defaultSheet.id ? updatedSheet : s);
            updateSheets(updatedSheets);
        } else {
            const newSheet = {
                id: generateId(),
                name: `${genre} 아이디어`,
                genre,
                items: [newItem],
                createdAt: new Date().toISOString(),
            };
            updateSheets([newSheet]);
        }

        setSavedIds(prev => new Set(prev).add(String(idx)));
    }

    const canGenerate = !!genre && !!mood && !!apiKey;

    return (
        <>
            <Header
                title="Video Ideation"
                subtitle="Gemini AI로 유튜브 영상 아이디어를 5개 생성합니다"
            />
            <div className="page-content">
                {/* ─── 입력 패널 ─── */}
                <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
                        {/* 장르 */}
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                장르 *
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {GENRES.map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => setGenre(g)}
                                        style={{
                                            padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12.5px',
                                            border: `1.5px solid ${genre === g ? 'var(--accent)' : 'var(--border)'}`,
                                            background: genre === g ? 'rgba(229,62,62,0.12)' : 'var(--bg-secondary)',
                                            color: genre === g ? 'var(--accent)' : 'var(--text-muted)',
                                            fontWeight: genre === g ? 700 : 400,
                                            transition: 'all 0.15s',
                                        }}
                                    >{g}</button>
                                ))}
                            </div>
                        </div>

                        {/* 분위기 */}
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                분위기 *
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {MOODS.map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMood(m)}
                                        style={{
                                            padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12.5px',
                                            border: `1.5px solid ${mood === m ? '#7c3aed' : 'var(--border)'}`,
                                            background: mood === m ? 'rgba(124,58,237,0.12)' : 'var(--bg-secondary)',
                                            color: mood === m ? '#a78bfa' : 'var(--text-muted)',
                                            fontWeight: mood === m ? 700 : 400,
                                            transition: 'all 0.15s',
                                        }}
                                    >{m}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <CreativityPanel value={creativity} onChange={setCreativity} />

                    {/* 브랜드 컨텍스트 + 모델 선택 + 버튼 */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                브랜드 컨텍스트 (자동 주입됨)
                            </div>
                            <input
                                className="form-input"
                                value={brandContext}
                                onChange={(e) => setBrandContext(e.target.value)}
                                placeholder="BrandKit 설정 시 자동 입력됩니다"
                                style={{ fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>모델</div>
                            <select
                                className="form-select"
                                value={model}
                                onChange={(e) => setModel(e.target.value as 'flash' | 'pro')}
                                style={{ minWidth: '140px' }}
                            >
                                <option value="flash">Flash (빠름)</option>
                                <option value="pro">Pro (고품질)</option>
                            </select>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleGenerate}
                            disabled={!canGenerate || state === 'loading'}
                            style={{ minWidth: '140px', height: '42px' }}
                        >
                            {state === 'loading' ? '생성 중...' : '아이디어 생성 →'}
                        </button>
                    </div>

                    {!apiKey && (
                        <div className="info-banner" style={{ marginTop: '14px', fontSize: '13px' }}>
                            Gemini API 키가 없습니다. <a href="/settings" style={{ color: 'var(--accent)' }}>설정 페이지</a>에서 입력하세요.
                        </div>
                    )}
                </div>

                {/* ─── 에러 ─── */}
                {state === 'error' && (
                    <div style={{ padding: '14px 18px', background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.3)', borderRadius: '10px', color: 'var(--accent)', fontSize: '13.5px', marginBottom: '20px' }}>
                        {errorMsg}
                    </div>
                )}

                {/* ─── 로딩 스켈레톤 ─── */}
                {state === 'loading' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="card loading-pulse" style={{ height: '200px', borderRadius: '12px' }} />
                        ))}
                    </div>
                )}

                {/* ─── 아이디어 카드 그리드 ─── */}
                {state === 'done' && ideas.length > 0 && (
                    <>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                            {genre} · {mood} — {ideas.length}개 아이디어 생성됨
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                            {ideas.map((idea, idx) => (
                                <IdeaCardItem
                                    key={idx}
                                    idea={idea}
                                    idx={idx}
                                    expanded={expandedIdx === idx}
                                    saved={savedIds.has(String(idx))}
                                    onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                                    onSave={() => handleSaveToScrapSheet(idea, idx)}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* ─── 초기 상태 ─── */}
                {state === 'idle' && (
                    <div className="empty-state">
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>💡</div>
                        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>장르와 분위기를 선택하세요</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Gemini AI가 유튜브 최적화 영상 아이디어 5개를 생성합니다
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

// ─── 카드 컴포넌트 ───────────────────────────────────────────────
interface IdeaCardItemProps {
    idea: IdeaCard;
    idx: number;
    expanded: boolean;
    saved: boolean;
    onToggle: () => void;
    onSave: () => void;
}

function IdeaCardItem({ idea, idx, expanded, saved, onToggle, onSave }: IdeaCardItemProps) {
    return (
        <div
            className="card"
            style={{
                padding: '20px',
                border: `1.5px solid ${expanded ? 'var(--accent)' : 'var(--border)'}`,
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: expanded ? 'var(--shadow-glow)' : 'none',
                cursor: 'pointer',
            }}
            onClick={onToggle}
        >
            {/* 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{
                    fontSize: '11px', padding: '3px 8px', borderRadius: '12px',
                    background: 'rgba(124,58,237,0.15)', color: '#a78bfa', fontWeight: 700,
                }}>
                    #{idx + 1} · {idea.mood}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{idea.duration}</span>
            </div>

            {/* 제목 */}
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.4 }}>
                {idea.title}
            </div>

            {/* 콘셉트 요약 */}
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '12px' }}>
                {expanded ? idea.concept : `${idea.concept.slice(0, 80)}...`}
            </div>

            {/* 태그 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {idea.tags.map((tag) => (
                    <span
                        key={tag}
                        style={{
                            fontSize: '11px', padding: '3px 8px', borderRadius: '12px',
                            background: 'var(--bg-secondary)', color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                        }}
                    >{tag}</span>
                ))}
            </div>

            {/* 확장 시 상세 */}
            {expanded && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', cursor: 'default' }}
                >
                    <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>썸네일 컨셉</div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{idea.thumbnail_concept}</div>
                    </div>
                    <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Suno AI 프롬프트</div>
                        <div style={{
                            fontSize: '12px', color: '#a78bfa', fontFamily: 'monospace',
                            background: 'rgba(124,58,237,0.08)', padding: '10px 12px',
                            borderRadius: '8px', lineHeight: 1.6, wordBreak: 'break-word',
                        }}>
                            {idea.suno_prompt}
                        </div>
                    </div>
                    <button
                        className={saved ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                        onClick={onSave}
                        disabled={saved}
                        style={{ width: '100%' }}
                    >
                        {saved ? '✅ ScrapSheet에 저장됨' : '+ ScrapSheet에 추가'}
                    </button>
                </div>
            )}

            {/* 축소 시 힌트 */}
            {!expanded && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                    클릭하여 상세 보기 ↓
                </div>
            )}
        </div>
    );
}
