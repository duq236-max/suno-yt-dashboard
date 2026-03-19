interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  change?: string;
  positive?: boolean;
  small?: boolean;
}

export default function StatCard({ label, value, icon, change, positive, small }: StatCardProps) {
  return (
    <div className="stat-card" style={small ? { padding: '14px 16px' } : undefined}>
      <div className="stat-card-top">
        <div className="stat-card-label" style={small ? { fontSize: '11px' } : undefined}>{label}</div>
        <div className="stat-card-icon" style={small ? { fontSize: '16px', width: '28px', height: '28px' } : undefined}>
          {icon}
        </div>
      </div>
      <div className="stat-card-value" style={small ? { fontSize: '20px' } : undefined}>{value}</div>
      {change && (
        <div className={`stat-card-change ${positive ? 'positive' : ''}`}>{change}</div>
      )}
    </div>
  );
}
