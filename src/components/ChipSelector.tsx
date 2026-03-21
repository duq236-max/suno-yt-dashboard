'use client';

import { useState } from 'react';

interface Chip {
  emoji: string;
  label: string;
}

interface ChipSelectorProps {
  label: string;
  chips: Chip[];
  selected: string[];
  onToggle: (chip: string) => void;
  multi: boolean;
  placeholder: string;
}

export default function ChipSelector({
  label,
  chips,
  selected,
  onToggle,
  multi,
  placeholder,
}: ChipSelectorProps) {
  const [customValue, setCustomValue] = useState('');

  const handleChipClick = (chipLabel: string) => {
    if (!multi && !selected.includes(chipLabel)) {
      // 라디오 모드: 기존 선택 모두 해제 후 새 칩 선택
      selected.forEach((s) => onToggle(s));
    }
    onToggle(chipLabel);
  };

  const handleCustomSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customValue.trim()) {
      onToggle(customValue.trim());
      setCustomValue('');
    }
  };

  // 섹션 헤더에서 번호와 제목 분리 (예: "1. 장르 선택" → num="1", title="장르 선택")
  const match = label.match(/^(\d+)\.\s*(.+)$/);
  const num = match?.[1];
  const title = match?.[2] ?? label;

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* 섹션 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        {num && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'rgba(124,58,237,0.25)',
              color: '#a78bfa',
              fontSize: '11px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {num}
          </span>
        )}
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {title}
        </span>
      </div>

      {/* 칩 목록 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        {chips.map((chip) => {
          const isSelected = selected.includes(chip.label);
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleChipClick(chip.label)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                border: isSelected
                  ? '1px solid rgba(124,58,237,0.6)'
                  : '1px solid var(--border)',
                background: isSelected
                  ? 'rgba(124,58,237,0.25)'
                  : 'var(--bg-card)',
                color: isSelected ? '#c4b5fd' : 'var(--text-muted)',
                transition: 'all var(--transition)',
              }}
            >
              <span>{chip.emoji}</span>
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* 직접 입력 */}
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={customValue}
        onChange={(e) => setCustomValue(e.target.value)}
        onKeyDown={handleCustomSubmit}
        style={{ fontSize: '12px', padding: '6px 10px', height: '34px' }}
      />
    </div>
  );
}
