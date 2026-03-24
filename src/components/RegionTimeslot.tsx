'use client';

import { REGION_UTC_OFFSET } from '@/data/seo-chips';

interface Props {
  region: string;
}

interface OptimalSlot {
  day: string;
  kstLabel: string;
  kstH: number;
}

const OPTIMAL_SLOTS: OptimalSlot[] = [
  { day: '평일', kstLabel: '오후 8시', kstH: 20 },
  { day: '주말', kstLabel: '오전 11시', kstH: 11 },
  { day: '주말', kstLabel: '오후 9시', kstH: 21 },
];

function kstToLocal(kstH: number, offset: number): string {
  let localH = kstH + offset - 9;
  let suffix = '';
  if (localH >= 24) {
    localH -= 24;
    suffix = ' (+1일)';
  } else if (localH < 0) {
    localH += 24;
    suffix = ' (-1일)';
  }
  const period = localH < 12 ? '오전' : '오후';
  const h12 = localH % 12 || 12;
  return `${period} ${h12}시${suffix}`;
}

export default function RegionTimeslot({ region }: Props) {
  const offset = REGION_UTC_OFFSET[region] ?? 9;
  const isSameAsKst = offset === 9;

  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
        {region} 기준 최적 업로드 시간
        {isSameAsKst ? ' (한국과 동일)' : ` (UTC${offset >= 0 ? '+' : ''}${offset})`}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {OPTIMAL_SLOTS.map((slot, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              alignItems: 'center',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>
              {slot.day} {slot.kstLabel} (KST)
            </span>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
              → {kstToLocal(slot.kstH, offset)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
