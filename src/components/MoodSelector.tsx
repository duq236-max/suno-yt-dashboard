'use client';

const MOODS = [
  '행복한', '감성적', '몽환적', '에너지틱',
  '슬픈', '신비로운', '평화로운', '신나는',
] as const;

interface MoodSelectorProps {
  value: string;
  onChange: (mood: string) => void;
}

export default function MoodSelector({ value, onChange }: MoodSelectorProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {MOODS.map((mood) => {
        const selected = value === mood;
        return (
          <button
            key={mood}
            type="button"
            className="btn btn-sm"
            onClick={() => onChange(mood)}
            style={
              selected
                ? { background: '#3b82f6', borderColor: '#3b82f6', color: '#fff' }
                : undefined
            }
          >
            {mood}
          </button>
        );
      })}
    </div>
  );
}
