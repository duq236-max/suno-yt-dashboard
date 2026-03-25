'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import CoverChipSelector from '@/components/CoverChipSelector';
import SheetCommandPalette from '@/components/SheetCommandPalette';
import SaveToSheetModal from '@/components/SaveToSheetModal';
import { COVER_CHIPS } from '@/data/cover-chips';
import type { CoverImageForm, CoverImageOutput, CoverImageHistory } from '@/types/cover-image';
import type { ScrapSheet } from '@/types';
import {
  loadData,
  saveData,
  generateId,
  saveCoverImageHistory,
  loadCoverImageHistory,
} from '@/lib/supabase-storage';

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
  const [errorMsg, setErrorMsg] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState<string>('16:9');
  const [history, setHistory] = useState<CoverImageHistory[]>([]);

  useEffect(() => {
    loadData()
      .then((data) => {
        setSheets(data.sheets ?? []);
        setApiKey(data.geminiApiKey ?? '');
      })
      .catch(() => {});
    loadCoverImageHistory().then(setHistory).catch(() => {});
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
    setErrorMsg('');
    if (!apiKey) {
      setErrorMsg('Settings에서 Gemini API 키를 먼저 입력하세요.');
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
      const data = await res.json() as CoverImageOutput & { error?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? '생성 중 오류가 발생했습니다.');
        return;
      }
      setOutput(data);
      setActiveTab('claude');
      // 이력 저장
      const styleLabel = [...form.artStyle, ...form.mood].slice(0, 2).join(', ') || '기본';
      const record: CoverImageHistory = {
        id: generateId(),
        prompt: data.geminiPrompt,
        imageUrl: pollinationsUrl(data.geminiPrompt, form.aspectRatio),
        style: styleLabel,
        createdAt: new Date().toISOString(),
      };
      saveCoverImageHistory(record).catch(() => {});
      const updated = await loadCoverImageHistory();
      setHistory(updated);
    } catch {
      setErrorMsg('생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveConfirm(sheetId: string, openSuno: boolean) {
    if (!output) return;
    const appData = await loadData();
    const sheets = appData.sheets ?? [];
    const target = sheets.find((s) => s.id === sheetId);
    if (!target) return;
    const newItem = {
      id: generateId(),
      title: '커버 이미지 프롬프트',
      prompt: output.geminiPrompt,
      lyrics: output.claudeInstruction,
      genre: '',
      status: 'unused' as const,
      instruments: '',
      mood_tags: form.mood,
      is_instrumental: false,
      createdAt: new Date().toISOString(),
    };
    const updatedSheet = { ...target, items: [...target.items, newItem] };
    const updatedSheets = sheets.map((s) => (s.id === sheetId ? updatedSheet : s));
    await saveData({ ...appData, sheets: updatedSheets });
    setShowSaveModal(false);
    if (openSuno) window.open('https://suno.com', '_blank');
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
        {errorMsg && (
          <p style={{ marginTop: 8, color: 'var(--accent)', fontSize: 13 }}>
            {errorMsg}
          </p>
        )}
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
          {activeTab === 'preview' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  gap: 12,
                  alignItems: 'start',
                }}
              >
                {(['16:9', '1:1', '9:16'] as const).map((ratio) => {
                  const imgUrl = output ? pollinationsUrl(output.geminiPrompt, ratio) : null;
                  const isSelected = selectedRatio === ratio;
                  return (
                    <div
                      key={ratio}
                      onClick={() => setSelectedRatio(ratio)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div
                        style={{
                          borderRadius: 8,
                          border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                          overflow: 'hidden',
                          background: 'var(--bg-secondary)',
                          aspectRatio: ratio.replace(':', '/'),
                          position: 'relative',
                        }}
                      >
                        {imgUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgUrl}
                            alt={`${ratio} 미리보기`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        )}
                      </div>
                      <p
                        style={{
                          textAlign: 'center',
                          fontSize: 11,
                          marginTop: 4,
                          color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                          fontWeight: isSelected ? 600 : 400,
                        }}
                      >
                        {ratio}
                      </p>
                    </div>
                  );
                })}
              </div>
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

      {output && (
        <div className="card" style={{ marginTop: 12 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowSaveModal(true)}
          >
            💾 스크랩시트에 저장
          </button>
        </div>
      )}

      {showSaveModal && (
        <SaveToSheetModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onConfirm={handleSaveConfirm}
        />
      )}

      {/* 이력 패널 (최근 3개) */}
      {history.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: 12,
            }}
          >
            🕐 최근 생성 이력
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.slice(0, 3).map((item) => {
              const date = new Date(item.createdAt).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              const shortPrompt =
                item.prompt.length > 60
                  ? item.prompt.slice(0, 60) + '…'
                  : item.prompt;
              return (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt="커버 썸네일"
                    style={{
                      width: 56,
                      height: 32,
                      objectFit: 'cover',
                      borderRadius: 4,
                      flexShrink: 0,
                      background: 'var(--bg-secondary)',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {shortPrompt}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {date} · {item.style}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
