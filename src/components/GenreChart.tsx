'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface GenreChartProps {
  data: { genre: string; count: number }[];
}

const COLORS = ['#e53e3e', '#fc5050', '#ff6b6b', '#ff8787', '#ffa5a5'];

export default function GenreChart({ data }: GenreChartProps) {
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
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
        <XAxis
          dataKey="genre"
          tick={{ fill: '#666', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#666', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#fff',
          }}
          formatter={(value: unknown) => [(value as number), '프롬프트 수']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
