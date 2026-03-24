'use client';

import { useState } from 'react';
import type { CoverChipSection } from '@/types/cover-image';

interface Props {
  sections: CoverChipSection[];
  selected: Record<string, string[]>;
  onToggle: (sectionId: string, value: string) => void;
}

export default function CoverChipSelector({ sections, selected, onToggle }: Props) {
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [customChips, setCustomChips] = useState<Record<string, string[]>>({});

  function addCustom(sectionId: string) {
    const val = (customInputs[sectionId] ?? '').trim();
    if (!val) return;
    setCustomChips((prev) => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] ?? []), val],
    }));
    setCustomInputs((prev) => ({ ...prev, [sectionId]: '' }));
    onToggle(sectionId, val);
  }

  function removeCustom(sectionId: string, val: string) {
    setCustomChips((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).filter((v) => v !== val),
    }));
    if ((selected[sectionId] ?? []).includes(val)) {
      onToggle(sectionId, val);
    }
  }

  return (
    <div className="chip-selector">
      {sections.map((sec) => (
        <div key={sec.id} className="chip-section">
          <div className="chip-section-label">{sec.label}</div>
          <div className="chip-row">
            {sec.chips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                className={`chip${(selected[sec.id] ?? []).includes(chip.value) ? ' selected' : ''}`}
                onClick={() => onToggle(sec.id, chip.value)}
              >
                {chip.label}
              </button>
            ))}
            {(customChips[sec.id] ?? []).map((val) => (
              <button
                key={val}
                type="button"
                className={`chip${(selected[sec.id] ?? []).includes(val) ? ' selected' : ''}`}
                onClick={() => onToggle(sec.id, val)}
              >
                <span className="chip-label">{val}</span>
                <span
                  className="chip-del"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCustom(sec.id, val);
                  }}
                >
                  ×
                </span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="text"
              placeholder="기타 직접 입력"
              value={customInputs[sec.id] ?? ''}
              className="form-input"
              style={{ flex: 1, fontSize: 13 }}
              onChange={(e) =>
                setCustomInputs((prev) => ({ ...prev, [sec.id]: e.target.value }))
              }
              onKeyDown={(e) => e.key === 'Enter' && addCustom(sec.id)}
            />
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => addCustom(sec.id)}
            >
              추가
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
