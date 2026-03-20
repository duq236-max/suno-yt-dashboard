'use client';

import dynamic from 'next/dynamic';

export interface RevenuePieSlice {
  name: string;
  value: number;
  color: string;
}

interface RevenuePieChartInnerProps {
  data: RevenuePieSlice[];
}

// ── 실제 차트 컴포넌트 (브라우저 전용) ──────────────────────────
function RevenuePieChartInner({ data }: RevenuePieChartInnerProps) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } = require('recharts');

  const total = data.reduce((s, d) => s + d.value, 0);

  if (!data || data.length === 0 || total === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '180px',
          color: 'var(--text-muted)',
          fontSize: '13px',
        }}
      >
        수익 데이터가 없습니다
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry: RevenuePieSlice, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`₩${value.toLocaleString()}`, '']}
            labelStyle={{ color: 'var(--text-primary)' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', color: 'var(--text-muted)' }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* 도넛 중앙 총합 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.2 }}>합계</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          ₩{total.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// ── dynamic import (SSR 비활성화) ────────────────────────────────
const RevenuePieChart = dynamic<RevenuePieChartInnerProps>(
  () => Promise.resolve(RevenuePieChartInner),
  { ssr: false, loading: () => <div style={{ height: '180px' }} /> }
);

export default RevenuePieChart;
