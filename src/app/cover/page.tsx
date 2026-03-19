'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { loadData } from '@/lib/storage';
import type { CoverResult } from '@/types';
import { CreativityPanel } from '@/components/CreativityPanel';

const GENRES = ['Lo-fi Hip-hop', 'Jazz', 'Classical Piano', 'Ambient', 'EDM', 'Chillhop', '수면 음악', '카페 BGM', '명상 음악', 'Nature Sounds'];

type GenerateState = 'idle' | 'loading' | 'done' | 'error';

export default function CoverPage() {
    const [apiKey, setApiKey] = useState('');
    const [channelName, setChannelName] = useState('');
    const [genre, setGenre] = useState('');
    const [keywords, setKeywords] = useState('');
    const [model, setModel] = useState<'flash' | 'pro'>('flash');
    const [state, setState] = useState<GenerateState>('idle');
    const [result, setResult] = useState<CoverResult | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [copiedField, setCopiedField] = useState<'sd' | 'neg' | null>(null);
    const [creativity, setCreativity] = useState({ temperature: 0.7, topP: 0.9, topK: 30 });

    useEffect(() => {
        const data = loadData();
        setApiKey(data.geminiApiKey ?? '');
        if (data.brandKit) {
            const bk = data.brandKit;
            if (bk.channelName) setChannelName(bk.channelName);
            if (bk.primaryGenre) setGenre(bk.primaryGenre);
            if (bk.moodKeywords?.length) setKeywords(bk.moodKeywords.slice(0, 4).join(', '));
        }
    }, []);

    async function handleGenerate() {
        if (!apiKey) { setErrorMsg('설정 페이지에서 Gemini API 키를 먼저 입력하세요.'); setState('error'); return; }
        if (!channelName || !genre) { setErrorMsg('채널명과 장르를 입력하세요.'); setState('error'); return; }

        setState('loading');
        setErrorMsg('');
        setResult(null);

        try {
            const res = await fetch('/api/gemini/cover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, model, channelName, genre, keywords, creativityParams: creativity }),
            });

            const json = await res.json() as CoverResult & { error?: string };

            if (!res.ok || json.error) {
                throw new Error(json.error ?? '알 수 없는 오류');
            }

            setResult(json);
            setState('done');
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
            setState('error');
        }
    }

    async function handleCopy(text: string, field: 'sd' | 'neg') {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    }

    const canGenerate = !!channelName && !!genre && !!apiKey;

    return (
        <>
            <Header
                title="Cover Generator"
                subtitle="Gemini AI로 썸네일·커버 이미지 프롬프트를 생성합니다"
            />
            <div className="page-content">
                {/* ─── 입력 패널 ─── */}
                <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        {/* 채널명 */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">채널명 *</label>
                            <input
                                className="form-input"
                                value={channelName}
                                onChange={(e) => setChannelName(e.target.value)}
                                placeholder="예: 새벽감성 Lo-fi"
                                style={{ fontSize: '13px' }}
                            />
                        </div>

                        {/* 키워드/분위기 */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">키워드 / 분위기 (선택)</label>
                            <input
                                className="form-input"
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                                placeholder="예: 새벽, 잔잔함, 감성적, 빈티지"
                                style={{ fontSize: '13px' }}
                            />
                        </div>
                    </div>

                    {/* 장르 선택 */}
                    <div style={{ marginBottom: '20px' }}>
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

                    {/* 창의성 파라미터 */}
                    <CreativityPanel value={creativity} onChange={setCreativity} />

                    {/* 모델 선택 + 생성 버튼 */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginTop: '20px' }}>
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
                            style={{ minWidth: '160px', height: '42px' }}
                        >
                            {state === 'loading' ? '생성 중...' : '🎨 커버 프롬프트 생성 →'}
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

                {/* ─── 로딩 ─── */}
                {state === 'loading' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="card loading-pulse" style={{ height: '140px', borderRadius: '12px' }} />
                        ))}
                    </div>
                )}

                {/* ─── 결과 ─── */}
                {state === 'done' && result && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* 제목 제안 + 컬러 팔레트 */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px' }}>
                            <div className="card" style={{ padding: '20px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                                    썸네일 텍스트 제안
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                                    {result.title_suggestion}
                                </div>
                                <div style={{ marginTop: '14px', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                                    {result.composition}
                                </div>
                            </div>

                            {/* 컬러 팔레트 */}
                            <div className="card" style={{ padding: '20px', minWidth: '180px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
                                    컬러 팔레트
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {result.color_palette.map((hex) => (
                                        <div key={hex} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div
                                                title={hex}
                                                style={{
                                                    width: '32px', height: '32px', borderRadius: '8px',
                                                    background: hex, border: '1px solid var(--border)',
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{hex}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* SD 프롬프트 */}
                        <div className="card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                    Stable Diffusion Positive Prompt
                                </div>
                                <button
                                    onClick={() => handleCopy(result.sd_prompt, 'sd')}
                                    className="btn btn-secondary btn-sm"
                                >
                                    {copiedField === 'sd' ? '✅ 복사됨' : '📋 복사'}
                                </button>
                            </div>
                            <div style={{
                                fontSize: '12.5px', color: '#86efac', fontFamily: 'monospace',
                                background: 'rgba(134,239,172,0.06)', padding: '12px 14px',
                                borderRadius: '8px', lineHeight: 1.7, wordBreak: 'break-word',
                            }}>
                                {result.sd_prompt}
                            </div>
                        </div>

                        {/* Negative 프롬프트 */}
                        <div className="card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                    Negative Prompt
                                </div>
                                <button
                                    onClick={() => handleCopy(result.negative_prompt, 'neg')}
                                    className="btn btn-secondary btn-sm"
                                >
                                    {copiedField === 'neg' ? '✅ 복사됨' : '📋 복사'}
                                </button>
                            </div>
                            <div style={{
                                fontSize: '12.5px', color: '#fca5a5', fontFamily: 'monospace',
                                background: 'rgba(252,165,165,0.06)', padding: '12px 14px',
                                borderRadius: '8px', lineHeight: 1.7, wordBreak: 'break-word',
                            }}>
                                {result.negative_prompt}
                            </div>
                        </div>

                        {/* 디자인 팁 + 스타일 태그 */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="card" style={{ padding: '20px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
                                    디자인 팁
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {result.design_tips.map((tip, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                            <span style={{
                                                width: '20px', height: '20px', borderRadius: '50%',
                                                background: 'var(--accent-dim)', color: 'var(--accent)',
                                                fontSize: '11px', fontWeight: 700,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                {i + 1}
                                            </span>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{tip}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="card" style={{ padding: '20px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
                                    스타일 태그 (Canva / 검색용)
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {result.style_tags.map((tag) => (
                                        <span
                                            key={tag}
                                            style={{
                                                fontSize: '12px', padding: '5px 10px', borderRadius: '20px',
                                                background: 'rgba(229,62,62,0.08)', color: 'var(--accent)',
                                                border: '1px solid rgba(229,62,62,0.2)',
                                            }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 재생성 버튼 */}
                        <div style={{ textAlign: 'center', paddingTop: '8px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={handleGenerate}
                                style={{ minWidth: '180px' }}
                            >
                                🔄 다시 생성
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── 초기 상태 ─── */}
                {state === 'idle' && (
                    <div className="empty-state">
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎨</div>
                        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>채널명과 장르를 입력하세요</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Gemini AI가 Stable Diffusion 프롬프트와 디자인 가이드를 생성합니다
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
