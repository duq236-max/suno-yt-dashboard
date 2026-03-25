'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import CoverChipSelector from '@/components/CoverChipSelector';
import SheetCommandPalette from '@/components/SheetCommandPalette';
import { COVER_CHIPS } from '@/data/cover-chips';
import type { CoverImageForm, CoverImageOutput } from '@/types/cover-image';
import type { ScrapSheet } from '@/types';
import { loadData } from '@/lib/supabase-storage';

const RATIO_DIMS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1280, height: 720 },
  '1:1':  { width: 1024, height: 1024 },
  '4:5':  { width: 1024, height: 1280 },
  '9:16': { width: 720,  height: 1280 },
};

function pollinationsUrl(prompt: string, aspectRatio: string): string {
  const dims = RATIO_DIMS[aspectRatio] ?? RATIO_DIMS['16:9'];
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${dims.width}&height=${dims.height}&nologo=true`;
}

const DEFAULT_FORM: CoverImageForm = {
  mood: [],
  color: [],
  concept: [],
  artStyle: [],
  lighting: [],
  timeSeason: [],
  textStyle: [],
  composition: [],
  freeDescription: '',
  aspectRatio: '16:9',
};

const SECTION_TO_KEY: Record<string, keyof CoverImageForm> = {
  mood: 'mood',
  color: 'color',
  concept: 'concept',
  artStyle: 'artStyle',
  lighting: 'lighting',
  timeSeason: 'timeSeason',
  textStyle: 'textStyle',
  composition: 'composition',
};

type OutputTab = 'claude' | 'gemini' | 'preview';

export default function CoverImageGeneratorPage() {
  const [form, setForm] = useState<CoverImageForm>(DEFAULT_FORM);
  const [sheets, setSheets] = useState<ScrapSheet[]>([]);
  const [showPalette, setShowPalette] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<CoverImageOutput | null>(null);
  const [activeTab, setActiveTab] = useState<OutputTab>('claude');
  const [apiKey, setApiKey] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    loadData()
      .then((data) => {
        setSheets(data.sheets ?? []);
        setApiKey(data.geminiApiKey ?? '');
      })
      .catch(() => {});
  }, []);

  function handleChipToggle(sectionId: string, value: string) {
    const key = SECTION_TO_KEY[sectionId];
    if (!key) return;
    const current = form[key] as string[];
    setForm((prev) => ({
      ...prev,
      [key]: current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    }));
  }

  function handleSheetSelect(sheet: ScrapSheet) {
    const genres = [
      ...new Set(sheet.items.map((i) => i.genre).filter(Boolean) as string[]),
    ].slice(0, 3);
    const moods = [
      ...new Set(sheet.items.flatMap((i) => i.mood_tags ?? [])),
    ].slice(0, 3);
    setForm((prev) => ({ ...prev, concept: genres, mood: moods }));
  }

  const selected = Object.fromEntries(
    Object.entries(SECTION_TO_KEY).map(([sid, key]) => [
      sid,
      form[key] as string[],
    ])
  );

  async function handleGenerate() {
    if (!apiKey) {
      alert('Settings에서 Gemini API 키를 먼저 입력하세요.');
      return;
    }
    setIsGenerating(true);
    setOutput(null);
    try {
      const res = await fetch('/api/cover-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, apiKey }),
      });
      const data = (await res.json()) as CoverImageOutput;
      setOutput(data);
      setActiveTab('claude');
    } catch {
      alert('생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    });
  }

  const activeText =
    output == null
      ? ''
      : activeTab === 'claude'
      ? output.claudeInstruction
      : activeTab === 'gemini'
      ? output.geminiPrompt
      : output.conceptPreview;

  const previewImageUrl =
    output && activeTab === 'preview'
      ? pollinationsUrl(output.geminiPrompt, form.aspectRatio)
      : null;

  return (
    <div className="page-content">
      <Header
        title="커버 이미지 생성기"
        subtitle="분위기와 스타일을 선택하면 유튜브 썸네일·채널아트 프롬프트를 생성합니다"
      />

      {/* 시트 연동 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowPalette(true)}
        >
          📋 시트에서 분위기 불러오기
        </button>
      </div>

      {showPalette && (
        <SheetCommandPalette
          sheets={sheets}
          onSelect={handleSheetSelect}
          onClose={() => setShowPalette(false)}
        />
      )}

      {/* 칩 선택 */}
      <div className="card">
        <CoverChipSelector
          sections={COVER_CHIPS}
          selected={selected}
          onToggle={handleChipToggle}
        />

        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label">자유 무드 설명</label>
          <textarea
            className="form-textarea"
            placeholder="추가로 원하는 분위기나 요소를 자유롭게 설명하세요..."
            value={form.freeDescription}
            rows={3}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, freeDescription: e.target.value }))
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label">이미지 비율</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['16:9', '1:1', '4:5', '9:16'] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                className={`btn btn-sm ${
                  form.aspectRatio === ratio ? 'btn-primary' : 'btn-secondary'
                }`}
                onClick={() =>
                  setForm((prev) => ({ ...prev, aspectRatio: ratio }))
                }
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ marginTop: 8 }}
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? '생성 중...' : '🖼 커버 이미지 프롬프트 생성'}
        </button>
      </div>

      {/* 결과 */}
      {output && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {(['claude', 'gemini', 'preview'] as const).map((tab) => (
              <button
                key={tab}
                className={`btn btn-sm ${
                  activeTab === tab ? 'btn-primary' : 'btn-secondary'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'claude'
                  ? 'Claude 작업지시서'
                  : tab === 'gemini'
                  ? 'Gemini 프롬프트'
                  : '컨셉 미리보기'}
              </button>
            ))}
          </div>
          {previewImageUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImageUrl}
                alt="Pollinations 이미지 미리보기"
                style={{
                  width: '100%',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  objectFit: 'cover',
                }}
              />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {output?.conceptPreview}
              </p>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  background: 'var(--bg-secondary)',
                  padding: '12px 16px',
                  borderRadius: 8,
                  paddingRight: 80,
                }}
              >
                {activeText}
              </pre>
              <button
                className="btn btn-sm btn-secondary"
                style={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => handleCopy(activeText)}
              >
                {copyFeedback ? '✓ 복사됨' : '복사'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
