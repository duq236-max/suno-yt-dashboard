'use client';

import { useEffect, useRef, useState } from 'react';

export interface CreativityParams {
    temperature: number;
    topP: number;
    topK: number;
}

interface Preset {
    label: string;
    values: CreativityParams;
}

const PRESETS: Preset[] = [
    { label: '정밀', values: { temperature: 0.3, topP: 0.85, topK: 10 } },
    { label: '균형', values: { temperature: 0.7, topP: 0.9, topK: 30 } },
    { label: '창의적', values: { temperature: 0.9, topP: 0.95, topK: 35 } },
    { label: '카오스', values: { temperature: 1.0, topP: 1.0, topK: 40 } },
];

const STORAGE_KEY = 'creativityParams';

const DEFAULT_PARAMS: CreativityParams = { temperature: 0.7, topP: 0.9, topK: 30 };

function loadStored(): CreativityParams {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_PARAMS;
        const parsed = JSON.parse(raw) as Partial<CreativityParams>;
        return {
            temperature: typeof parsed.temperature === 'number' ? parsed.temperature : DEFAULT_PARAMS.temperature,
            topP: typeof parsed.topP === 'number' ? parsed.topP : DEFAULT_PARAMS.topP,
            topK: typeof parsed.topK === 'number' ? parsed.topK : DEFAULT_PARAMS.topK,
        };
    } catch {
        return DEFAULT_PARAMS;
    }
}

interface Props {
    value: CreativityParams;
    onChange: (params: CreativityParams) => void;
}

export function CreativityPanel({ value, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const initialized = useRef(false);

    // 첫 마운트 시 localStorage 복원
    useEffect(() => {
        if (!initialized.current) {
            initialized.current = true;
            onChange(loadStored());
        }
    }, [onChange]);

    // 값 변경 시 localStorage 저장
    useEffect(() => {
        if (!initialized.current) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        } catch {
            // localStorage 접근 불가 환경 무시
        }
    }, [value]);

    function handleSlider(key: keyof CreativityParams, raw: string) {
        const num = key === 'topK' ? parseInt(raw, 10) : parseFloat(raw);
        onChange({ ...value, [key]: num });
    }

    function handlePreset(preset: CreativityParams) {
        onChange({ ...preset });
    }

    const activePreset = PRESETS.find(
        (p) =>
            p.values.temperature === value.temperature &&
            p.values.topP === value.topP &&
            p.values.topK === value.topK
    );

    return (
        <div className="card" style={{ marginBottom: '1rem' }}>
            <button
                type="button"
                className="card-header"
                onClick={() => setOpen((o) => !o)}
                style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: '1rem 1.25rem',
                    color: 'var(--text-primary)',
                }}
            >
                <span className="card-title" style={{ margin: 0, fontSize: '0.9rem' }}>
                    창의성 파라미터{activePreset ? ` — ${activePreset.label}` : ''}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {open ? '▲ 접기' : '▼ 펼치기'}
                </span>
            </button>

            {open && (
                <div style={{ padding: '0 1.25rem 1.25rem' }}>
                    {/* 프리셋 버튼 */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                        {PRESETS.map((p) => (
                            <button
                                key={p.label}
                                type="button"
                                className={activePreset?.label === p.label ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                                onClick={() => handlePreset(p.values)}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* 슬라이더 */}
                    <SliderRow
                        label="Temperature"
                        hint="낮을수록 일관성 ↑ / 높을수록 다양성 ↑"
                        value={value.temperature}
                        min={0}
                        max={1}
                        step={0.01}
                        display={value.temperature.toFixed(2)}
                        onChange={(v) => handleSlider('temperature', v)}
                    />
                    <SliderRow
                        label="Top-P"
                        hint="누적 확률 임계값 — 낮을수록 안전한 단어 선택"
                        value={value.topP}
                        min={0}
                        max={1}
                        step={0.01}
                        display={value.topP.toFixed(2)}
                        onChange={(v) => handleSlider('topP', v)}
                    />
                    <SliderRow
                        label="Top-K"
                        hint="후보 단어 수 — 낮을수록 예측 가능한 가사"
                        value={value.topK}
                        min={1}
                        max={40}
                        step={1}
                        display={String(value.topK)}
                        onChange={(v) => handleSlider('topK', v)}
                    />
                </div>
            )}
        </div>
    );
}

interface SliderRowProps {
    label: string;
    hint: string;
    value: number;
    min: number;
    max: number;
    step: number;
    display: string;
    onChange: (raw: string) => void;
}

function SliderRow({ label, hint, value, min, max, step, display, onChange }: SliderRowProps) {
    return (
        <div className="form-group" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                <label className="form-label" style={{ margin: 0, fontSize: '0.8rem' }}>{label}</label>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>{display}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{hint}</p>
        </div>
    );
}
