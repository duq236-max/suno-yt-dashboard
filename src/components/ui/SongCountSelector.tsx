interface SongCountSelectorProps {
  value: number;
  options: number[];
  onChange: (count: number) => void;
  label?: string;
}

export function SongCountSelector({ value, options, onChange, label }: SongCountSelectorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {label && (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '4px' }}>
          {label}
        </span>
      )}
      {options.map((opt) => {
        const isSelected = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '13px',
              fontWeight: isSelected ? 700 : 400,
              cursor: 'pointer',
              border: `1px solid ${isSelected ? '#f472b6' : 'rgba(255,255,255,0.08)'}`,
              background: isSelected ? '#f472b6' : 'rgba(255,255,255,0.04)',
              color: isSelected ? '#fff' : '#64748b',
              boxShadow: isSelected ? '0 2px 14px rgba(244,114,182,0.4)' : 'none',
              transition: 'all 0.18s ease',
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
