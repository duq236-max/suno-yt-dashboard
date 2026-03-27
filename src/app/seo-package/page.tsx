'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import SeoChipSelector from '@/components/SeoChipSelector';
import SheetCommandPalette from '@/components/SheetCommandPalette';
import { SEO_CHIPS } from '@/data/seo-chips';
import type { SeoForm, SeoOutput } from '@/types/seo-package';
import type { ScrapSheet } from '@/types';
import { loadData } from '@/lib/supabase-storage';
import { saveSeoHistory, loadSeoHistory, deleteSeoHistory, type SeoHistoryEntry } from '@/lib/supabase-storage';
import SaveToSheetModal from '@/components/SaveToSheetModal';
import styles from './page.module.css';

const SINGLE_SECTION_IDS = new Set(['language', 'region', 'strategy']);

const DEFAULT_FORM: SeoForm = {
    targetAge: [],
    language: '한국어',
    category: [],
    format: [],
    situation: [],
    region: '한국',
    strategy: '조회수 최대화',
    customRequest: '',
};

function SeoPackageContent() {
    const searchParams = useSearchParams();
    const [form, setForm] = useState<SeoForm>(DEFAULT_FORM);
    const [titleInput, setTitleInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [output, setOutput] = useState<SeoOutput | null>(null);
    const [uploadTime, setUploadTime] = useState('');
    const [copied, setCopied] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [seoHistory, setSeoHistory] = useState<SeoHistoryEntry[]>([]);
    const [sheets, setSheets] = useState<ScrapSheet[]>([]);
    const [showPalette, setShowPalette] = useState(false);
    const [linkedSheet, setLinkedSheet] = useState<ScrapSheet | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        const titleParam = searchParams.get('title');
        if (titleParam) setTitleInput(decodeURIComponent(titleParam));
        loadData().then((data) => {
            setApiKey(data.geminiApiKey ?? '');
            setSheets(data.sheets ?? []);
        }).catch(() => {});
        loadSeoHistory().then(setSeoHistory).catch(() => {});
    }, [searchParams]);

    function handleSheetSelect(sheet: ScrapSheet) {
        const genres = [
            ...new Set(sheet.items.map((i) => i.genre).filter(Boolean) as string[]),
        ].slice(0, 2);
        setLinkedSheet(sheet);
        if (genres.length > 0 && !titleInput) {
            setTitleInput(genres.join(', '));
        }
    }

    function handleChipSelect(sectionId: string, value: string) {
        if (SINGLE_SECTION_IDS.has(sectionId)) {
            setForm((prev) => ({
                ...prev,
                [sectionId]: value,
            }));
        } else {
            const key = sectionId as 'targetAge' | 'category' | 'format' | 'situation';
            setForm((prev) => {
                const current = prev[key] as string[];
                const next = current.includes(value)
                    ? current.filter((v) => v !== value)
                    : [...current, value];
                return { ...prev, [key]: next };
            });
        }
    }

    function getSelected(): Record<string, string | string[]> {
        return {
            targetAge: form.targetAge,
            language: form.language,
            category: form.category,
            format: form.format,
            situation: form.situation,
            region: form.region,
            strategy: form.strategy,
        };
    }

    async function generate() {
        if (!apiKey) {
            setErrorMsg('Gemini API 키가 없습니다. 설정에서 입력하세요.');
            return;
        }
        setIsGenerating(true);
        setOutput(null);
        setErrorMsg('');
        try {
            const seoForm = { ...form, customRequest: titleInput ? `임시 제목: ${titleInput}. ${form.customRequest}` : form.customRequest };
            const res = await fetch('/api/seo-package', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ form: seoForm, apiKey }),
            });
            const data = await res.json() as { output?: SeoOutput; uploadTime?: string; error?: string };
            if (data.error) {
                setErrorMsg(data.error);
                return;
            }
            if (data.output) {
                setOutput(data.output);
                setUploadTime(data.uploadTime ?? '');
                try {
                    await saveSeoHistory({
                        titleInput,
                        seoScore: data.output.seoScore,
                        titles: data.output.titles,
                        mainKeywords: data.output.mainKeywords,
                        tags: data.output.tags,
                        longTailKeywords: data.output.longTailKeywords,
                        description: data.output.description,
                        chapters: data.output.chapters,
                        uploadTimes: data.output.uploadTimes,
                        claudeInstruction: data.output.claudeInstruction,
                    });
                    loadSeoHistory().then(setSeoHistory).catch(() => {});
                } catch {
                    // 이력 저장 실패는 무시 (생성 결과는 이미 표시됨)
                }
            }
        } catch {
            setErrorMsg('서버 오류가 발생했습니다.');
        } finally {
            setIsGenerating(false);
        }
    }

    function copy(text: string, key: string) {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(key);
            setTimeout(() => setCopied(null), 1500);
        }).catch(() => {});
    }

    function copyAll() {
        if (!output) return;
        const parts = [
            '[제목 후보]',
            output.titles.join('\n'),
            '',
            '[메인 키워드]',
            output.mainKeywords.join(', '),
            '',
            '[롱테일 키워드]',
            output.longTailKeywords.join(', '),
            '',
            '[영상 설명문]',
            output.description,
            '',
            '[업로드 최적 시간]',
            uploadTime,
            '',
            '[태그]',
            output.tags.join(', '),
        ];
        copy(parts.join('\n'), 'all');
    }

    const scoreColor = output
        ? output.seoScore >= 80
            ? '#22c55e'
            : output.seoScore >= 60
            ? '#f59e0b'
            : '#ef4444'
        : '#374151';

    return (
        <div className="page-content">
            <Header
                title="🔍 SEO 최적화 패키지"
                subtitle="메인/롱테일 키워드 · 제목 후보 5개 · 설명문 · 태그 30개 · 업로드 최적 시간"
            />

            {/* 연동 배너 — URL 파라미터가 있거나 시트가 선택된 경우 표시 */}
            {(searchParams.get('title') ?? searchParams.get('genre') ?? linkedSheet) ? (
                <div
                    className="info-banner"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                        🎵 음악생성 연동 중
                        {(searchParams.get('title') ?? titleInput) && (
                            <> — <strong>{searchParams.get('title') ?? titleInput}</strong></>
                        )}
                        {searchParams.get('genre') && (
                            <> · <span style={{ color: 'var(--text-muted)' }}>{searchParams.get('genre')}</span></>
                        )}
                        {linkedSheet && (
                            <> · 📋 <span style={{ color: '#22c55e' }}>{linkedSheet.name}</span></>
                        )}
                    </span>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ flexShrink: 0, marginLeft: 12 }}
                        onClick={() => setShowPalette(true)}
                    >
                        🗂️ 시트 선택
                    </button>
                </div>
            ) : null}

            {showPalette && (
                <SheetCommandPalette
                    sheets={sheets}
                    onSelect={handleSheetSelect}
                    onClose={() => setShowPalette(false)}
                />
            )}

            {/* API 키 경고 */}
            {!apiKey && (
                <div
                    className="info-banner"
                    style={{ marginBottom: 16, borderColor: 'var(--accent)', color: 'var(--accent)' }}
                >
                    ⚠️ Gemini API 키가 없습니다.{' '}
                    <a href="/settings" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                        설정
                    </a>
                    에서 입력하세요.
                </div>
            )}

            <div className="seo-grid">
                {/* ── 왼쪽: 입력 패널 ── */}
                <div className="card" style={{ overflow: 'hidden' }}>
                    <div
                        className="card-header"
                        style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                            ⚙️ SEO 설정
                        </span>
                    </div>
                    <div style={{ padding: 16 }}>
                        {/* 임시 제목 입력 */}
                        <div className="form-group">
                            <label className="form-label">플레이리스트 임시 제목</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="예: Midnight Rain — Lo-fi 플레이리스트"
                                value={titleInput}
                                onChange={(e) => setTitleInput(e.target.value)}
                            />
                        </div>

                        {/* 칩 선택기 */}
                        <SeoChipSelector
                            sections={SEO_CHIPS}
                            selected={getSelected()}
                            onSelect={handleChipSelect}
                        />

                        {/* 추가 요청 */}
                        <div className="form-group" style={{ marginTop: 12 }}>
                            <label className="form-label">추가 요청사항</label>
                            <textarea
                                className="form-textarea"
                                placeholder="특별히 강조할 키워드나 경쟁 채널, 참고할 트렌드를 입력하세요"
                                rows={3}
                                value={form.customRequest}
                                onChange={(e) => setForm((prev) => ({ ...prev, customRequest: e.target.value }))}
                            />
                        </div>

                        {/* 생성 버튼 */}
                        <button
                            type="button"
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: 4 }}
                            onClick={generate}
                            disabled={isGenerating}
                        >
                            {isGenerating ? '⏳ SEO 분석 중...' : '🔍 SEO 패키지 생성'}
                        </button>

                        {errorMsg && (
                            <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>{errorMsg}</p>
                        )}
                    </div>
                </div>

                {/* ── 오른쪽: 결과 패널 ── */}
                <div>
                    {/* 플레이스홀더 */}
                    {!output && !isGenerating && (
                        <div
                            className="glass-card"
                            style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)' }}
                        >
                            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                            <h3 style={{ fontSize: 16, color: '#4a5568', marginBottom: 8, fontWeight: 600 }}>
                                SEO 패키지가 여기 표시됩니다
                            </h3>
                            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                                왼쪽에서 설정 후 <strong>SEO 패키지 생성</strong>을 누르세요
                            </p>
                        </div>
                    )}

                    {/* 로딩 */}
                    {isGenerating && (
                        <div
                            className="glass-card loading-pulse"
                            style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)' }}
                        >
                            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                            <p>Gemini AI가 SEO를 분석하는 중...</p>
                        </div>
                    )}

                    {/* 결과 4카드 */}
                    {output && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* 액션 버튼 + SEO 점수 */}
                            <div className="glass-card" style={{ padding: '14px 18px' }}>
                                <div className={styles.scoreInner}>
                                    <div
                                        style={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: '50%',
                                            border: `3px solid ${scoreColor}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 18,
                                            fontWeight: 700,
                                            color: scoreColor,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {output.seoScore}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                            SEO 점수
                                        </div>
                                        <div
                                            style={{
                                                width: '100%',
                                                maxWidth: 200,
                                                height: 6,
                                                background: 'var(--bg-secondary)',
                                                borderRadius: 999,
                                                marginTop: 6,
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: `${output.seoScore}%`,
                                                    height: '100%',
                                                    background: scoreColor,
                                                    borderRadius: 999,
                                                    transition: 'width 0.6s ease',
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.actionsInline}>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={copyAll}
                                        >
                                            {copied === 'all' ? '✅ 복사됨' : '📋 전체 복사'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setShowSaveModal(true)}
                                        >
                                            💾 저장
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 📌 제목 카드 */}
                            <div className="glass-card" style={{ overflow: 'hidden' }}>
                                <div
                                    className={styles.resultCardHeader}
                                    style={{ borderBottomColor: 'rgba(236,72,153,0.3)' }}
                                >
                                    <span style={{ color: '#f9a8d4', fontWeight: 700, fontSize: 13 }}>
                                        📌 제목 후보
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-ghost"
                                        onClick={() => copy(output.titles.slice(0, 5).join('\n'), 'titles')}
                                    >
                                        {copied === 'titles' ? '✅ 복사됨' : '전체 복사'}
                                    </button>
                                </div>
                                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                                    {output.titles.slice(0, 5).map((title, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                background: 'rgba(236,72,153,0.05)',
                                                border: '1px solid rgba(236,72,153,0.15)',
                                                borderRadius: 8,
                                                padding: '9px 12px',
                                            }}
                                        >
                                            <span style={{ fontSize: 11, color: '#f9a8d4', fontWeight: 700, width: 18, flexShrink: 0 }}>
                                                {i + 1}
                                            </span>
                                            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                                {title}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-ghost"
                                                style={{ padding: '2px 8px', fontSize: 11 }}
                                                onClick={() => copy(title, `title-${i}`)}
                                            >
                                                {copied === `title-${i}` ? '✅' : '복사'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 🏷️ 태그 카드 */}
                            <div className="glass-card" style={{ overflow: 'hidden' }}>
                                <div
                                    className={styles.resultCardHeader}
                                    style={{ borderBottomColor: 'rgba(168,85,247,0.3)' }}
                                >
                                    <span style={{ color: '#c4b5fd', fontWeight: 700, fontSize: 13 }}>
                                        🏷️ 태그 ({output.tags.length}개)
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-ghost"
                                        onClick={() => copy(output.tags.join(', '), 'tags')}
                                    >
                                        {copied === 'tags' ? '✅ 복사됨' : '전체 복사'}
                                    </button>
                                </div>
                                <div style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {output.tags.map((tag, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => copy(tag, `tag-${i}`)}
                                            style={{
                                                background: copied === `tag-${i}` ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.08)',
                                                border: `1px solid ${copied === `tag-${i}` ? 'rgba(168,85,247,0.6)' : 'rgba(168,85,247,0.2)'}`,
                                                borderRadius: 20,
                                                padding: '4px 11px',
                                                fontSize: 11,
                                                color: copied === `tag-${i}` ? '#c4b5fd' : '#a78bfa',
                                                cursor: 'pointer',
                                                transition: 'var(--transition)',
                                            }}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 🔑 키워드 카드 */}
                            <div className="glass-card" style={{ overflow: 'hidden' }}>
                                <div
                                    className={styles.resultCardHeader}
                                    style={{ borderBottomColor: 'rgba(59,130,246,0.3)' }}
                                >
                                    <span style={{ color: '#93c5fd', fontWeight: 700, fontSize: 13 }}>
                                        🔑 키워드
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-ghost"
                                        onClick={() => copy([...output.mainKeywords, ...output.longTailKeywords].join(', '), 'kws')}
                                    >
                                        {copied === 'kws' ? '✅ 복사됨' : '전체 복사'}
                                    </button>
                                </div>
                                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>메인</div>
                                    {output.mainKeywords.map((kw, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '8px 10px',
                                                borderRadius: 7,
                                                background: 'rgba(59,130,246,0.07)',
                                                border: '1px solid rgba(59,130,246,0.18)',
                                            }}
                                        >
                                            <span style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700, width: 18, flexShrink: 0 }}>{i + 1}</span>
                                            <span style={{ flex: 1, fontSize: 13, color: '#d1fae5' }}>{kw}</span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-ghost"
                                                style={{ padding: '2px 8px', fontSize: 11 }}
                                                onClick={() => copy(kw, `mkw-${i}`)}
                                            >
                                                {copied === `mkw-${i}` ? '✅' : '복사'}
                                            </button>
                                        </div>
                                    ))}
                                    {output.longTailKeywords.length > 0 && (
                                        <>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, marginBottom: 4, fontWeight: 600 }}>롱테일</div>
                                            {output.longTailKeywords.map((kw, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                        padding: '8px 10px',
                                                        borderRadius: 7,
                                                        background: 'rgba(59,130,246,0.04)',
                                                        border: '1px solid rgba(59,130,246,0.1)',
                                                    }}
                                                >
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, width: 18, flexShrink: 0 }}>{i + 1}</span>
                                                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-muted)' }}>{kw}</span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-ghost"
                                                        style={{ padding: '2px 8px', fontSize: 11 }}
                                                        onClick={() => copy(kw, `ltkw-${i}`)}
                                                    >
                                                        {copied === `ltkw-${i}` ? '✅' : '복사'}
                                                    </button>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* 📝 설명문 카드 */}
                            <div className="glass-card" style={{ overflow: 'hidden' }}>
                                <div
                                    className={styles.resultCardHeader}
                                    style={{ borderBottomColor: 'rgba(34,197,94,0.3)' }}
                                >
                                    <span style={{ color: '#86efac', fontWeight: 700, fontSize: 13 }}>
                                        📝 영상 설명문
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-ghost"
                                        onClick={() => copy(output.description, 'desc')}
                                    >
                                        {copied === 'desc' ? '✅ 복사됨' : '복사'}
                                    </button>
                                </div>
                                <div style={{ padding: '14px 16px' }}>
                                    <div
                                        style={{
                                            background: 'rgba(34,197,94,0.04)',
                                            border: '1px solid rgba(34,197,94,0.15)',
                                            borderRadius: 8,
                                            padding: 14,
                                            fontSize: 13,
                                            color: 'var(--text-muted)',
                                            lineHeight: 1.8,
                                            whiteSpace: 'pre-wrap',
                                        }}
                                    >
                                        {output.description}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── SEO 이력 패널 ── */}
                    {seoHistory.length > 0 && (
                        <div className="card" style={{ marginTop: 20, overflow: 'hidden' }}>
                            <div
                                className="card-header"
                                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                onClick={() => setShowHistory((v) => !v)}
                            >
                                <span className="card-title">🕒 최근 SEO 이력 ({seoHistory.length})</span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{showHistory ? '▲' : '▼'}</span>
                            </div>
                            {showHistory && (
                                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {seoHistory.slice(0, 5).map((entry) => {
                                        const entryScoreColor = entry.seoScore >= 80
                                            ? '#22c55e'
                                            : entry.seoScore >= 60
                                            ? '#f59e0b'
                                            : '#ef4444';
                                        return (
                                            <div
                                                key={entry.id}
                                                style={{
                                                    background: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 8,
                                                    padding: '10px 14px',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 12,
                                                }}
                                            >
                                                <div style={{ fontSize: 14, fontWeight: 700, color: entryScoreColor, minWidth: 32, flexShrink: 0 }}>
                                                    {entry.seoScore}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {entry.titleInput || entry.titles[0] || '제목 없음'}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {entry.mainKeywords.slice(0, 3).join(' · ')}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }}>
                                                    {new Date(entry.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-ghost"
                                                        style={{ padding: '2px 8px', fontSize: 11 }}
                                                        onClick={() => {
                                                            setTitleInput(entry.titleInput || entry.titles[0] || '');
                                                            setOutput({
                                                                seoScore: entry.seoScore,
                                                                titles: entry.titles,
                                                                mainKeywords: entry.mainKeywords,
                                                                tags: entry.tags,
                                                                longTailKeywords: entry.longTailKeywords ?? [],
                                                                description: entry.description ?? '',
                                                                chapters: entry.chapters ?? [],
                                                                uploadTimes: entry.uploadTimes ?? [],
                                                                claudeInstruction: entry.claudeInstruction ?? '',
                                                            });
                                                        }}
                                                    >
                                                        불러오기
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger"
                                                        style={{ padding: '2px 8px', fontSize: 11 }}
                                                        onClick={() => {
                                                            deleteSeoHistory(entry.id).then(() => {
                                                                setSeoHistory((prev) => prev.filter((e) => e.id !== entry.id));
                                                            }).catch(() => {});
                                                        }}
                                                    >
                                                        🗑 삭제
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── SaveToSheetModal ── */}
            <SaveToSheetModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onConfirm={() => {
                    setShowSaveModal(false);
                }}
            />
        </div>
    );
}

export default function SeoPackagePage() {
    return (
        <Suspense>
            <SeoPackageContent />
        </Suspense>
    );
}
