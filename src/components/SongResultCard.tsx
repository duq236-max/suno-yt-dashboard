'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GeneratedSong } from '@/types/music-generator';

interface SongResultCardProps {
  index: number;
  song: GeneratedSong;
  onSendToSuno?: (song: GeneratedSong) => void;
}

function StyleCopyButton({ style, fullWidth = false }: { style: string; fullWidth?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(style);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (fullWidth) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); void handleCopy(); }}
        style={{ ...ACTION_BTN_STYLE, border: '1px solid rgba(236,72,153,0.3)', color: '#f9a8d4', background: 'rgba(236,72,153,0.08)' }}
      >
        {copied ? '✓ 복사됨' : '🏷️ 스타일 복사'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); void handleCopy(); }}
      className="btn btn-sm btn-secondary"
      style={{ fontSize: '11px', padding: '4px 10px', flexShrink: 0 }}
    >
      {copied ? '✓ 복사됨' : '🏷️ 스타일 복사'}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn btn-sm btn-secondary"
      style={{ fontSize: '11px', padding: '4px 10px' }}
    >
      {copied ? '✓ 복사됨' : '복사'}
    </button>
  );
}

const ACTION_BTN_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '5px',
  flex: 1,
  height: '36px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'var(--transition)',
  whiteSpace: 'nowrap',
};

export default function SongResultCard({ index, song, onSendToSuno }: SongResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  // 제목에서 짧은 태그라인 추출 (첫 괄호 안 텍스트 또는 스타일 첫 단어)
  const tagline = song.style.split(',')[0]?.trim() ?? '';

  return (
    <div
      className="card glass-card"
      style={{ padding: '0', overflow: 'hidden', marginBottom: '8px' }}
    >
      {/* 접힌 상태 헤더 — 항상 보임 */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* 번호 원형 뱃지 (핑크) */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(236,72,153,0.2)',
            color: '#f9a8d4',
            fontSize: '12px',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {index}
        </span>

        {/* 제목 + 태그라인 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {song.title}
          </div>
          {tagline && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {tagline}
            </div>
          )}
        </div>

        {/* 스타일 태그 복사 버튼 */}
        <StyleCopyButton style={song.style} />

        {/* 화살표 */}
        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: '12px',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--transition)',
            flexShrink: 0,
          }}
        >
          ▼
        </span>
      </button>

      {/* 펼친 상태 내용 */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* TITLE 섹션 */}
          <Section label="TITLE" content={song.title} />

          {/* GENRE / STYLE 섹션 */}
          <Section label="GENRE / STYLE" content={song.style} />

          {/* LYRICS 섹션 */}
          <Section label="LYRICS" content={song.lyrics} multiline />

          {/* 하단 액션 버튼 3개 */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <StyleCopyButton style={song.style} fullWidth />
            <button
              type="button"
              style={ACTION_BTN_STYLE}
              onClick={() => {
                const title = encodeURIComponent(song.title);
                const mood = encodeURIComponent(song.style.split(',')[0]?.trim() ?? '');
                router.push(`/cover-image-generator?title=${title}&mood=${mood}`);
              }}
            >
              🎨 커버이미지
            </button>
            <button
              type="button"
              style={ACTION_BTN_STYLE}
              onClick={() => {
                const title = encodeURIComponent(song.title);
                router.push(`/seo-package?title=${title}`);
              }}
            >
              🔍 SEO 패키지
            </button>
          </div>

          {/* Suno 전송 버튼 */}
          {onSendToSuno && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onSendToSuno(song)}
              >
                🎵 Suno로 전송
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* 내부 섹션 컴포넌트 */
function Section({
  label,
  content,
  multiline = false,
}: {
  label: string;
  content: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <CopyButton text={content} />
      </div>
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 12px',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: multiline ? 1.7 : 1.4,
          whiteSpace: multiline ? 'pre-wrap' : 'normal',
          wordBreak: 'break-word',
          maxHeight: multiline ? '200px' : 'none',
          overflowY: multiline ? 'auto' : 'visible',
        }}
      >
        {content}
      </div>
    </div>
  );
}
