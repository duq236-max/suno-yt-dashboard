'use client';

import { useState, useEffect } from 'react';
import { goldenPrompts, type GoldenPrompt } from '@/data/golden-prompts';
import { vocalStyles, type VocalStyle } from '@/data/vocal-styles';

type Tab = 'prompts' | 'vocals';

const LANGUAGE_LABELS: Record<GoldenPrompt['language'], string> = {
  korean: '한국어',
  english: 'English',
  japanese: '日本語',
  any: '범용',
};

const GENDER_LABELS: Record<VocalStyle['gender'], string> = {
  male: '남',
  female: '여',
  neutral: '중성',
};

type ExtensionStatus = 'unknown' | 'installed' | 'not_installed';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('prompts');
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>('unknown');
  const [sentWarning, setSentWarning] = useState<Record<string, boolean>>({});

  // J2: Extension 설치 감지 — ping 후 800ms 내 pong 없으면 미설치로 판단
  useEffect(() => {
    const timer = setTimeout(() => setExtensionStatus('not_installed'), 800);

    function onMessage(e: MessageEvent<{ type?: string }>) {
      if (e.data?.type === 'SUNO_EXTENSION_PONG') {
        clearTimeout(timer);
        setExtensionStatus('installed');
      }
    }

    window.addEventListener('message', onMessage);
    window.postMessage({ type: 'SUNO_EXTENSION_PING' }, '*');

    return () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
    };
  }, []);

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopied((prev) => ({ ...prev, [id]: false }));
      }, 1500);
    });
  }

  // J2: Extension으로 프롬프트 전송
  function handleSendToSuno(id: string, sunoPrompt: string) {
    if (extensionStatus !== 'installed') {
      setSentWarning((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => setSentWarning((prev) => ({ ...prev, [id]: false })), 3000);
      return;
    }
    window.postMessage({ type: 'SUNO_INJECT', prompt: sunoPrompt }, '*');
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">📚 프롬프트 라이브러리</h1>
        <p className="page-subtitle">황금 프롬프트와 보컬 스타일을 한 곳에서 조회하고 복사하세요</p>
      </div>

      {/* 탭 버튼 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          className={activeTab === 'prompts' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setActiveTab('prompts')}
        >
          🏆 황금 프롬프트
        </button>
        <button
          className={activeTab === 'vocals' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setActiveTab('vocals')}
        >
          🎤 보컬 스타일
        </button>
      </div>

      {/* 황금 프롬프트 탭 */}
      {activeTab === 'prompts' && (
        <div className="stats-grid">
          {goldenPrompts.map((p) => {
            const copyId = `prompt-${p.id}`;
            return (
              <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                    {p.title}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  >
                    {LANGUAGE_LABELS[p.language]}
                  </span>
                  {p.bpm && (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {p.bpm} BPM
                    </span>
                  )}
                </div>

                {/* Suno 프롬프트 코드블록 */}
                <pre
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    margin: 0,
                    fontFamily: 'monospace',
                  }}
                >
                  {p.sunoPrompt}
                </pre>

                {/* 결과 곡 이름 */}
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  🎵 <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.resultTitle}</span>
                </div>

                {/* 저작권 팁 */}
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    lineHeight: '1.6',
                  }}
                >
                  {p.notes}
                </div>

                {/* 버튼 행: 복사 + Suno 전송 */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: 'auto' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopy(copyId, p.sunoPrompt)}
                  >
                    {copied[copyId] ? '✓ 복사됨' : 'Suno 프롬프트 복사'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleSendToSuno(p.id, p.sunoPrompt)}
                    style={{ fontSize: '12px' }}
                  >
                    🚀 Suno로 전송
                  </button>
                </div>
                {sentWarning[p.id] && (
                  <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px' }}>
                    ⚠️ Extension이 설치되어 있지 않습니다.{' '}
                    <a
                      href="https://chrome.google.com/webstore"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                    >
                      설치하기
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 보컬 스타일 탭 */}
      {activeTab === 'vocals' && (
        <div className="stats-grid">
          {vocalStyles.map((v) => {
            const copyId = `vocal-${v.id}`;
            return (
              <div key={v.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                    {v.name}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      background: v.gender === 'female' ? '#9333ea' : 'var(--accent)',
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  >
                    {GENDER_LABELS[v.gender]}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {v.genre}
                  </span>
                </div>

                {/* 설명 */}
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  {v.description}
                </div>

                {/* 키워드 태그 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {v.sunoKeywords.map((kw) => (
                    <span
                      key={kw}
                      style={{
                        fontSize: '11px',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>

                {/* 복사 버튼 */}
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: 'flex-start', marginTop: 'auto' }}
                  onClick={() => handleCopy(copyId, v.sunoKeywords.join(', '))}
                >
                  {copied[copyId] ? '✓ 복사됨' : '키워드 복사'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
