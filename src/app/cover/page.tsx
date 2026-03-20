'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import { loadData, generateId, addThumbnailHistory, loadThumbnailHistory, toggleThumbnailFavorite } from '@/lib/storage';
import type { CoverResult, ThumbnailHistoryItem } from '@/types';
import { CreativityPanel } from '@/components/CreativityPanel';

const GENRES = ['Lo-fi Hip-hop', 'Jazz', 'Classical Piano', 'Ambient', 'EDM', 'Chillhop', '수면 음악', '카페 BGM', '명상 음악', 'Nature Sounds'];

const STYLE_PRESETS = [
    { label: '🎌 일본 애니', genre: 'J-Pop Anime', keywords: 'anime illustration, pastel colors, japanese text overlay, cute character' },
    { label: '🔥 힙합 어반', genre: 'Hip-Hop Trap', keywords: 'urban street, neon lights, dark background, graffiti, bold typography' },
    { label: '🌿 자연 힐링', genre: 'Lo-Fi Ambient', keywords: 'nature scenery, soft morning light, peaceful forest, watercolor style' },
    { label: '👤 인물 클로즈업', genre: 'K-Pop Ballad', keywords: 'close-up portrait, emotional expression, cinematic lighting, bokeh' },
    { label: '📺 TV 목업', genre: 'Cinematic', keywords: 'vintage TV screen, retro CRT monitor, glowing screen, dark room' },
    { label: '👆 클릭 유도형', genre: 'Pop', keywords: 'high contrast, bright colors, bold text, arrow graphic, excited face' },
];

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
    const [selectedPresetLabel, setSelectedPresetLabel] = useState('');
    const [japaneseOverlay, setJapaneseOverlay] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    // D4: Pollinations 이미지 생성
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [imageLoadState, setImageLoadState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    // I5: 썸네일 이력
    const [thumbnailHistory, setThumbnailHistory] = useState<ThumbnailHistoryItem[]>([]);

    useEffect(() => {
        const data = loadData();
        setApiKey(data.geminiApiKey ?? '');
        if (data.brandKit) {
            const bk = data.brandKit;
            if (bk.channelName) setChannelName(bk.channelName);
            if (bk.primaryGenre) setGenre(bk.primaryGenre);
            if (bk.moodKeywords?.length) setKeywords(bk.moodKeywords.slice(0, 4).join(', '));
        }
        setThumbnailHistory(loadThumbnailHistory());
    }, []);

    async function handleGenerate() {
        if (!apiKey) { setErrorMsg('설정 페이지에서 Gemini API 키를 먼저 입력하세요.'); setState('error'); return; }
        if (!channelName || !genre) { setErrorMsg('채널명과 장르를 입력하세요.'); setState('error'); return; }

        setState('loading');
        setErrorMsg('');
        setResult(null);

        try {
            // I3: 일본어 오버레이 키워드 합산
            let finalKeywords = keywords;
            if (selectedPresetLabel === '🎌 일본 애니' && japaneseOverlay.trim()) {
                finalKeywords = finalKeywords
                    ? `${finalKeywords}, japanese text overlay: ${japaneseOverlay.trim()}`
                    : `japanese text overlay: ${japaneseOverlay.trim()}`;
            }
            // I4: Shorts 비율 키워드 합산
            if (aspectRatio === '9:16') {
                const shortsKw = 'vertical format, 9:16 ratio, mobile optimized';
                finalKeywords = finalKeywords ? `${finalKeywords}, ${shortsKw}` : shortsKw;
            }

            const res = await fetch('/api/gemini/cover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, model, channelName, genre, keywords: finalKeywords, creativityParams: creativity }),
            });

            const json = await res.json() as CoverResult & { error?: string };

            if (!res.ok || json.error) {
                throw new Error(json.error ?? '알 수 없는 오류');
            }

            setResult(json);
            setState('done');
            // D4: 새 생성 시 이전 이미지 초기화
            setGeneratedImageUrl(null);
            setImageLoadState('idle');
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

    // D4: Pollinations.AI 이미지 생성
    function handleGenerateImage() {
        if (!result) return;
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(result.sd_prompt)}`;
        setGeneratedImageUrl(url);
        setImageLoadState('loading');

        const item: ThumbnailHistoryItem = {
            id: generateId(),
            prompt: result.sd_prompt,
            imageUrl: url,
            style: selectedPresetLabel || genre,
            createdAt: new Date().toISOString(),
            isFavorite: false,
        };
        const updated = addThumbnailHistory(item);
        setThumbnailHistory(updated);
    }

    // I5: 즐겨찾기 토글
    function handleToggleFavorite(id: string) {
        const updated = toggleThumbnailFavorite(id);
        setThumbnailHistory(updated);
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
                    {/* 스타일 프리셋 */}
                    <div className="card" style={{ marginBottom: '16px', padding: '16px', background: 'var(--bg-secondary)' }}>
                        <h3 className="card-title" style={{ marginBottom: '12px', fontSize: '13px' }}>스타일 프리셋</h3>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {STYLE_PRESETS.map(preset => (
                                <button
                                    key={preset.label}
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                        setGenre(preset.genre);
                                        setKeywords(preset.keywords);
                                        setSelectedPresetLabel(preset.label);
                                        if (preset.label !== '🎌 일본 애니') setJapaneseOverlay('');
                                    }}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', marginBottom: 0 }}>
                            프리셋 클릭 시 장르·키워드 자동 입력
                        </p>

                        {/* I3: 일본어 오버레이 입력 — 🎌 일본 애니 선택 시만 표시 */}
                        {selectedPresetLabel === '🎌 일본 애니' && (
                            <div style={{ marginTop: '12px', padding: '12px 14px', background: 'rgba(124,58,237,0.06)', borderRadius: '8px', border: '1px solid rgba(124,58,237,0.2)' }}>
                                <label style={{ fontSize: '11px', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '6px' }}>
                                    🎌 일본어 오버레이 텍스트 (선택)
                                </label>
                                <input
                                    className="form-input"
                                    value={japaneseOverlay}
                                    onChange={(e) => setJapaneseOverlay(e.target.value)}
                                    placeholder="예: さよならの予後"
                                    style={{ fontSize: '13px' }}
                                />
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0 }}>
                                    입력 시 keywords에 &quot;japanese text overlay: [텍스트]&quot;로 자동 삽입됩니다
                                </p>
                            </div>
                        )}
                    </div>

                    {/* I4: YouTube Shorts 비율 토글 */}
                    <div style={{ marginBottom: '16px', padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
                            이미지 비율
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {(['16:9', '9:16'] as const).map((ratio) => (
                                <button
                                    key={ratio}
                                    onClick={() => setAspectRatio(ratio)}
                                    style={{
                                        padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                                        border: `1.5px solid ${aspectRatio === ratio ? 'var(--accent)' : 'var(--border)'}`,
                                        background: aspectRatio === ratio ? 'rgba(229,62,62,0.10)' : 'var(--bg-secondary)',
                                        color: aspectRatio === ratio ? 'var(--accent)' : 'var(--text-muted)',
                                        fontWeight: aspectRatio === ratio ? 700 : 400,
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {ratio === '16:9' ? '📺 16:9 (썸네일)' : '📱 9:16 (Shorts)'}
                                </button>
                            ))}
                        </div>
                        {aspectRatio === '9:16' && (
                            <p style={{ fontSize: '12px', color: '#60a5fa', marginTop: '8px', marginBottom: 0 }}>
                                💡 Shorts 썸네일은 세로형으로 최적화됩니다. keywords에 세로 비율 태그가 자동 추가됩니다.
                            </p>
                        )}
                    </div>

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

                        {/* D4: Pollinations.AI 이미지 미리보기 */}
                        <div className="card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                    실제 이미지 미리보기
                                </div>
                                <button
                                    onClick={handleGenerateImage}
                                    disabled={imageLoadState === 'loading'}
                                    className="btn btn-primary btn-sm"
                                >
                                    {imageLoadState === 'loading' ? '생성 중...' : '🎨 Pollinations.AI로 이미지 생성'}
                                </button>
                            </div>
                            {!generatedImageUrl && imageLoadState === 'idle' && (
                                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                    버튼을 눌러 무료 AI 이미지를 생성하세요
                                </div>
                            )}
                            {imageLoadState === 'loading' && (
                                <div className="loading-pulse" style={{ height: '220px', borderRadius: '8px' }} />
                            )}
                            {generatedImageUrl && (
                                <>
                                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden', display: imageLoadState === 'done' ? 'block' : 'none' }}>
                                        <Image
                                            src={generatedImageUrl}
                                            alt="Generated thumbnail"
                                            fill
                                            style={{ objectFit: 'cover' }}
                                            onLoad={() => setImageLoadState('done')}
                                            onError={() => setImageLoadState('error')}
                                            unoptimized
                                        />
                                    </div>
                                    {imageLoadState === 'error' && (
                                        <div style={{ padding: '16px', color: 'var(--accent)', fontSize: '13px', background: 'rgba(229,62,62,0.08)', borderRadius: '8px' }}>
                                            이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요.
                                        </div>
                                    )}
                                </>
                            )}
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

                {/* I5: 썸네일 생성 이력 갤러리 */}
                {thumbnailHistory.length > 0 && (
                    <div className="card" style={{ padding: '20px', marginTop: '8px' }}>
                        <div className="card-header" style={{ marginBottom: '16px' }}>
                            <span className="card-title">생성 이력</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>최근 {thumbnailHistory.length}개</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                            {thumbnailHistory.map(item => (
                                <div key={item.id} style={{
                                    borderRadius: '10px', overflow: 'hidden',
                                    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                    position: 'relative',
                                }}>
                                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.style}
                                            fill
                                            style={{ objectFit: 'cover' }}
                                            unoptimized
                                        />
                                    </div>
                                    <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                                            {item.style || '커스텀'}
                                        </span>
                                        <button
                                            onClick={() => handleToggleFavorite(item.id)}
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                fontSize: '16px', padding: '2px', lineHeight: 1,
                                                color: item.isFavorite ? '#ecc94b' : 'var(--text-muted)',
                                                transition: 'color 0.15s',
                                            }}
                                            title={item.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                                        >
                                            {item.isFavorite ? '★' : '☆'}
                                        </button>
                                    </div>
                                </div>
                            ))}
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
