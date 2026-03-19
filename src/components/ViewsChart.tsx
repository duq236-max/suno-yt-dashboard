'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ViewsChartProps {
  data: { date: string; views: number }[];
}

export default function ViewsChart({ data }: ViewsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '180px', color: 'var(--text-muted)', fontSize: '13px',
      }}>
        데이터가 없습니다
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#e53e3e" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#e53e3e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#666', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#666', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v >= 10000 ? (v / 10000).toFixed(0) + '만' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}
        />
        <Tooltip
          contentStyle={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#fff',
          }}
          labelStyle={{ color: '#999' }}
          formatter={(value: unknown) => [(value as number).toLocaleString(), '조회수']}
        />
        <Area
          type="monotone"
          dataKey="views"
          stroke="#e53e3e"
          strokeWidth={2}
          fill="url(#viewsGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#e53e3e', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
