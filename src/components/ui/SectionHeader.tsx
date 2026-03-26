interface SectionHeaderProps {
  num: string | number;
  icon: string;
  title: string;
}

export function SectionHeader({ num, icon, title }: SectionHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <span
        style={{
          background: 'linear-gradient(135deg, #f472b6, #a855f7)',
          color: '#fff',
          borderRadius: '5px',
          fontSize: '10px',
          padding: '2px 8px',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {num}
      </span>
      <span style={{ fontSize: '14px' }}>{icon}</span>
      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
        {title}
      </span>
    </div>
  );
}
