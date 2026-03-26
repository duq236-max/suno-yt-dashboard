'use client';

import { useState, useCallback } from 'react';
import type { ScrapSheet, ScrapStatus } from '@/types';

interface Props {
  sheets: ScrapSheet[];
  onSelect: (sheet: ScrapSheet) => void;
  onClose: () => void;
}

type SheetStatus = 'connected' | 'ready' | 'empty';

function deriveSheetStatus(sheet: ScrapSheet): SheetStatus {
  const statuses = sheet.items.map((i) => i.status as ScrapStatus);
  if (statuses.some((s) => s === 'used')) return 'connected';
  if (statuses.some((s) => s === 'ready')) return 'ready';
  return 'empty';
}

const STATUS_CONFIG: Record<SheetStatus, { label: string; color: string; bg: string }> = {
  connected: { label: '연동됨', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  ready:     { label: '준비',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  empty:     { label: '미생성', color: 'var(--text-muted)', bg: 'rgba(102,102,102,0.1)' },
};

export default function SheetCommandPalette({ sheets, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const filtered = sheets.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.items.some((i) => i.genre?.toLowerCase().includes(query.toLowerCase()))
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = filtered[focusedIndex];
        if (target) {
          onSelect(target);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, focusedIndex, onSelect, onClose]
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">시트에서 불러오기</h3>
        </div>
        <input
          autoFocus
          className="form-input"
          placeholder="시트 이름 또는 장르 검색… (↑↓ 탐색, ↵ 선택, ESC 닫기)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setFocusedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          style={{ marginBottom: 12 }}
        />
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
              결과 없음
            </p>
          )}
          {filtered.map((sheet, idx) => {
            const status = deriveSheetStatus(sheet);
            const cfg = STATUS_CONFIG[status];
            const isFocused = idx === focusedIndex;
            return (
              <button
                key={sheet.id}
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: isFocused ? 'var(--bg-secondary)' : 'transparent',
                  border: isFocused ? '1px solid var(--border)' : '1px solid transparent',
                  borderRadius: 8,
                }}
                onMouseEnter={() => setFocusedIndex(idx)}
                onClick={() => {
                  onSelect(sheet);
                  onClose();
                }}
              >
                <span style={{ flex: 1 }}>
                  <strong>{sheet.name}</strong>
                  <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    {sheet.items.length}개 항목
                  </span>
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: cfg.color,
                    background: cfg.bg,
                    padding: '2px 8px',
                    borderRadius: 20,
                    flexShrink: 0,
                  }}
                >
                  {cfg.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
