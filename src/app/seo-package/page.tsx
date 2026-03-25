'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import SeoChipSelector from '@/components/SeoChipSelector';
import RegionTimeslot from '@/components/RegionTimeslot';
import { SEO_CHIPS } from '@/data/seo-chips';
import type { SeoForm, SeoOutput } from '@/types/seo-package';
import { loadData } from '@/lib/supabase-storage';

type OutputTab = 'score' | 'desc' | 'claude';

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

export default function SeoPackagePage() {
    const [form, setForm] = useState<SeoForm>(DEFAULT_FORM);
    const [titleInput, setTitleInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [output, setOutput] = useState<SeoOutput | null>(null);
    const [uploadTime, setUploadTime] = useState('');
    const [activeTab, setActiveTab] = useState<OutputTab>('score');
    const [copied, setCopied] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        loadData().then((data) => {
            setApiKey(data.geminiApiKey ?? '');
        }).catch(() => {});
    }, []);

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
                setActiveTab('score');
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

    const scoreColor = output
        ? output.seoScore >= 80
            ? '#22c55e'
            : output.seoScore >= 60
            ? '#f59e0b'
            : '#ef4444'
        : '#374151';

    const tabs: { id: OutputTab; label: string }[] = [
        { id: 'score', label: '📊 SEO 점수 · 제목 · 키워드' },
        { id: 'desc', label: '📝 설명 · 태그 · 업로드 시간' },
        { id: 'claude', label: '🤖 Claude 작업지시서' },
    ];

    return (
        <div className="page-content">
            <Header
                title="🔍 SEO 최적화 패키지"
                subtitle="메인/롱테일 키워드 · 제목 후보 5개 · 설명문 · 태그 30개 · 업로드 최적 시간"
            />

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

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '360px 1fr',
                    gap: 24,
                    alignItems: 'start',
                }}
            >
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

                {/* ── 오른쪽: 출력 패널 ── */}
                <div>
                    {!output && !isGenerating && (
                        <div
                            className="card"
                            style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)' }}
                        >
                            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                            <h3 style={{ fontSize: 16, color: '#4a5568', marginBottom: 8, fontWeight: 600 }}>
                                SEO 설정 후 생성하세요
                            </h3>
                            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                                왼쪽에서 타겟 연령·언어·카테고리 등을 선택하고
                                <br />
                                <strong>SEO 패키지 생성</strong>을 누르면 AI가 분석합니다.
                            </p>
                        </div>
                    )}

                    {isGenerating && (
                        <div
                            className="card loading-pulse"
                            style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)' }}
                        >
                            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                            <p>Gemini AI가 SEO를 분석하는 중...</p>
                        </div>
                    )}

                    {output && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* SEO 점수 요약 */}
                            <div className="card" style={{ padding: '14px 18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                            SEO 점수
                                        </div>
                                        <div
                                            style={{
                                                width: 200,
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
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                        {tabs.map((tab) => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setActiveTab(tab.id)}
                                                style={{
                                                    padding: '5px 12px',
                                                    borderRadius: 20,
                                                    border: `1px solid ${activeTab === tab.id ? 'var(--accent)' : 'var(--border)'}`,
                                                    background: activeTab === tab.id
                                                        ? 'rgba(229,62,62,0.12)'
                                                        : 'transparent',
                                                    color: activeTab === tab.id
                                                        ? 'var(--accent)'
                                                        : 'var(--text-muted)',
                                                    fontSize: 11,
                                                    fontWeight: activeTab === tab.id ? 700 : 400,
                                                    cursor: 'pointer',
                                                    transition: 'var(--transition)',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ── 탭 1: 제목 · 키워드 ── */}
                            {activeTab === 'score' && (
                                <>
                                    {/* 제목 후보 5개 */}
                                    <div className="card" style={{ overflow: 'hidden' }}>
                                        <div
                                            className="card-header"
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        >
                                            <span className="card-title">🏆 제목 후보 5개</span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-ghost"
                                                onClick={() => copy(output.titles.join('\n'), 'titles')}
                                            >
                                                {copied === 'titles' ? '✓ 복사됨' : '전체 복사'}
                                            </button>
                                        </div>
                                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                                            {output.titles.map((title, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                        background: 'var(--bg-secondary)',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: 8,
                                                        padding: '9px 12px',
                                                    }}
                                                >
                                                    <span
                                                        style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, width: 18, flexShrink: 0 }}
                                                    >
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
                                                        {copied === `title-${i}` ? '✓' : '복사'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 메인 키워드 */}
                                    <div className="card" style={{ overflow: 'hidden' }}>
                                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className="card-title">🔑 메인 키워드</span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-ghost"
                                                onClick={() => copy(output.mainKeywords.join(', '), 'mainKw')}
                                            >
                                                {copied === 'mainKw' ? '✓ 복사됨' : '복사'}
                                            </button>
                                        </div>
                                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            {output.mainKeywords.map((kw, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                        padding: '8px 10px',
                                                        borderRadius: 7,
                                                        background: 'var(--bg-secondary)',
                                                        border: '1px solid var(--border)',
                                                    }}
                                                >
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, width: 18, flexShrink: 0 }}>{i + 1}</span>
                                                    <span style={{ flex: 1, fontSize: 13, color: '#d1fae5' }}>{kw}</span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-ghost"
                                                        style={{ padding: '2px 8px', fontSize: 11 }}
                                                        onClick={() => copy(kw, `mkw-${i}`)}
                                                    >
                                                        {copied === `mkw-${i}` ? '✓' : '복사'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 롱테일 키워드 */}
                                    <div className="card" style={{ overflow: 'hidden' }}>
                                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className="card-title">🔍 롱테일 키워드</span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-ghost"
                                                onClick={() => copy(output.longTailKeywords.join(', '), 'ltKw')}
                                            >
                                                {copied === 'ltKw' ? '✓ 복사됨' : '복사'}
                                            </button>
                                        </div>
                                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            {output.longTailKeywords.map((kw, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                        padding: '8px 10px',
                                                        borderRadius: 7,
                                                        background: 'var(--bg-secondary)',
                                                        border: '1px solid var(--border)',
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
                                                        {copied === `ltkw-${i}` ? '✓' : '복사'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ── 탭 2: 설명 · 태그 · 업로드 시간 ── */}
                            {activeTab === 'desc' && (
                                <>
                                    {/* 설명문 */}
                                    <div className="card" style={{ overflow: 'hidden' }}>
                                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className="card-title">📄 영상 설명문</span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-ghost"
                                                onClick={() => copy(output.description, 'desc')}
                                            >
                                                {copied === 'desc' ? '✓ 복사됨' : '복사'}
                                            </button>
                                        </div>
                                        <div style={{ padding: '14px 16px' }}>
                                            <div
                                                style={{
                                                    background: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border)',
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

                                    {/* 태그 */}
                                    <div className="card" style={{ overflow: 'hidden' }}>
                                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className="card-title">🏷️ 태그 ({output.tags.length}개)</span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-ghost"
                                                onClick={() => copy(output.tags.join(', '), 'tags')}
                                            >
                                                {copied === 'tags' ? '✓ 복사됨' : '전체 복사'}
                                            </button>
                                        </div>
                                        <div style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {output.tags.map((tag, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => copy(tag, `tag-${i}`)}
                                                    style={{
                                                        background: copied === `tag-${i}` ? 'rgba(34,197,94,0.15)' : '#172554',
                                                        border: `1px solid ${copied === `tag-${i}` ? '#22c55e' : '#1e3a8a'}`,
                                                        borderRadius: 6,
                                                        padding: '4px 10px',
                                                        fontSize: 11,
                                                        color: copied === `tag-${i}` ? '#22c55e' : '#93c5fd',
                                                        cursor: 'pointer',
                                                        transition: 'var(--transition)',
                                                    }}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 업로드 최적 시간 */}
                                    <div className="card" style={{ overflow: 'hidden' }}>
                                        <div className="card-header">
                                            <span className="card-title">⏰ 업로드 최적 시간</span>
                                        </div>
                                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            {uploadTime && (
                                                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                                                    {uploadTime}
                                                </p>
                                            )}
                                            <RegionTimeslot region={form.region || '한국'} />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ── 탭 3: Claude 작업지시서 ── */}
                            {activeTab === 'claude' && (
                                <div className="card" style={{ overflow: 'hidden' }}>
                                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="card-title">🤖 Claude.ai 작업지시서</span>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-ghost"
                                            onClick={() => copy(output.claudeInstruction, 'claude')}
                                        >
                                            {copied === 'claude' ? '✓ 복사됨' : '복사'}
                                        </button>
                                    </div>
                                    <div style={{ padding: '14px 16px' }}>
                                        <div
                                            style={{
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border)',
                                                borderRadius: 8,
                                                padding: 14,
                                                fontSize: 12,
                                                color: 'var(--text-muted)',
                                                lineHeight: 1.7,
                                                whiteSpace: 'pre-wrap',
                                                fontFamily: "'Courier New', monospace",
                                            }}
                                        >
                                            {output.claudeInstruction}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
