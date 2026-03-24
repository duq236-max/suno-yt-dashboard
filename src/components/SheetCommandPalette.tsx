'use client';

import { useState } from 'react';
import type { ScrapSheet } from '@/types';

interface Props {
  sheets: ScrapSheet[];
  onSelect: (sheet: ScrapSheet) => void;
  onClose: () => void;
}

export default function SheetCommandPalette({ sheets, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');

  const filtered = sheets.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.items.some((i) => i.genre?.toLowerCase().includes(query.toLowerCase()))
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
          placeholder="시트 이름 또는 장르 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <p
              style={{
                textAlign: 'center',
                padding: 24,
                color: 'var(--text-muted)',
              }}
            >
              결과 없음
            </p>
          )}
          {filtered.map((sheet) => (
            <button
              key={sheet.id}
              className="btn btn-ghost"
              style={{ width: '100%', textAlign: 'left', marginBottom: 4 }}
              onClick={() => {
                onSelect(sheet);
                onClose();
              }}
            >
              <strong>{sheet.name}</strong>
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  color: 'var(--text-muted)',
                }}
              >
                {sheet.items.length}개 항목
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
