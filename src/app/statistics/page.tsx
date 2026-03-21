'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import StatCard from '@/components/StatCard';
import Image from 'next/image';
import { loadData, loadRevenue } from '@/lib/supabase-storage';
import type { StatsSummary, ChannelStats } from '@/types';
import GenreChart from '@/components/GenreChart';
import RevenuePieChart from '@/components/RevenuePieChart';
import type { RevenuePieSlice } from '@/components/RevenuePieChart';

// 숫자 포맷 (1200000 → 1.2M)
function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// 7일 조회수 차트 데이터: 채널별 조회수 합산
function buildChartData(channels: ChannelStats[]): Record<string, number | string>[] {
  if (channels.length === 0) return [];
  const days = channels[0].weeklyViews.map((d) => d.date);
  return days.map((date, i) => {
    const row: Record<string, number | string> = { date };
    channels.forEach((ch) => {
      row[ch.channelName] = ch.weeklyViews[i]?.views ?? 0;
    });
    return row;
  });
}

const CHART_COLORS = ['#e53e3e', '#3182ce', '#38a169', '#d69e2e', '#805ad5'];

// 플랫폼 레이블 매핑
const PLATFORM_LABEL: Record<string, string> = {
  youtube: 'YouTube',
  distrokid: 'DistroKid',
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  other: '기타',
};

const PLATFORM_COLORS: Record<string, string> = {
  youtube: '#e53e3e',
  distrokid: '#3182ce',
  spotify: '#38a169',
  apple_music: '#805ad5',
  other: '#d69e2e',
};

export default function StatisticsPage() {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genreData, setGenreData] = useState<{ genre: string; count: number }[]>([]);
  const [revenuePieData, setRevenuePieData] = useState<RevenuePieSlice[]>([]);

  useEffect(() => {
    loadData().then((appData) => {
      const sheets = appData.sheets ?? [];
      const counts: Record<string, number> = {};
      sheets.forEach((sheet) => {
        (sheet.items ?? []).forEach((item) => {
          const g = item.genre || '기타';
          counts[g] = (counts[g] ?? 0) + 1;
        });
      });
      setGenreData(
        Object.entries(counts)
          .map(([genre, count]) => ({ genre, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      );
    });
  }, []);

  useEffect(() => {
    loadRevenue().then((entries) => {
      const totals: Record<string, number> = {};
      entries.forEach((e) => {
        totals[e.platform] = (totals[e.platform] ?? 0) + e.amount;
      });
      setRevenuePieData(
        Object.entries(totals)
          .filter(([, v]) => v > 0)
          .map(([platform, value]) => ({
            name: PLATFORM_LABEL[platform] ?? platform,
            value,
            color: PLATFORM_COLORS[platform] ?? '#888',
          })),
      );
    });
  }, []);

  const fetchStats = useCallback(async () => {
    const appData = await loadData();
    const channels = appData.youtubeChannels ?? [];
    const channelIds = channels
      .map((c) => c.channelId)
      .filter((id): id is string => Boolean(id));

    // YouTube API 키 없거나 채널 ID 없으면 로컬 데이터로 폴백
    if (channelIds.length === 0) {
      const fallback: StatsSummary = {
        totalSubscribers: channels.reduce((s, c) => s + (c.subscriberCount ?? 0), 0),
        totalViews: channels.reduce((s, c) => s + (c.totalViews ?? 0), 0),
        totalVideos: channels.reduce((s, c) => s + (c.videoCount ?? 0), 0),
        channelCount: channels.length,
        channels: channels.map((c) => ({
          channelId: c.channelId ?? c.id,
          channelName: c.channelName,
          thumbnailUrl: c.thumbnailUrl,
          subscriberCount: c.subscriberCount ?? 0,
          totalViews: c.totalViews ?? 0,
          videoCount: c.videoCount ?? 0,
          engagementRate: c.avgEngagement ?? 0,
          weeklyViews: [],
        })),
      };
      setSummary(fallback);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube/stats?channelIds=${channelIds.join(',')}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data: StatsSummary = await res.json();
      setSummary(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '통계를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const chartData = summary ? buildChartData(summary.channels) : [];
  const hasChannels = (summary?.channelCount ?? 0) > 0;

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">통합 통계</h1>
        <p className="page-subtitle">등록된 전체 YouTube 채널 통합 통계</p>
      </div>

      {/* ── 상단 요약 카드 ── */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <StatCard
          label="총 구독자"
          value={summary ? fmtNum(summary.totalSubscribers) : '—'}
          icon="👥"
        />
        <StatCard
          label="총 조회수"
          value={summary ? fmtNum(summary.totalViews) : '—'}
          icon="👁️"
        />
        <StatCard
          label="총 영상수"
          value={summary ? fmtNum(summary.totalVideos) : '—'}
          icon="🎬"
        />
        <StatCard
          label="연결된 채널"
          value={summary ? `${summary.channelCount}개` : '—'}
          icon="📺"
        />
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="loading-pulse" style={{ margin: '0 auto 12px', width: '40px', height: '40px', borderRadius: '50%' }} />
          <p style={{ color: 'var(--text-muted)' }}>채널 통계를 불러오는 중...</p>
        </div>
      )}

      {error && (
        <div className="info-banner" style={{ marginBottom: '24px', borderColor: 'var(--accent)' }}>
          <span>⚠️ {error}</span>
          <button className="btn btn-sm btn-ghost" onClick={fetchStats} style={{ marginLeft: 'auto' }}>
            다시 시도
          </button>
        </div>
      )}

      {!loading && !hasChannels && (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">연결된 채널 없음</div>
          <div className="empty-state-desc">
            대시보드에서 YouTube 채널을 먼저 연결해주세요.
          </div>
        </div>
      )}

      {/* ── 중간: 7일 조회수 AreaChart ── */}
      {!loading && hasChannels && chartData.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h2 className="card-title">최근 7일 조회수 추이</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                {summary?.channels.map((ch, i) => (
                  <linearGradient key={ch.channelId} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => fmtNum(v)} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                labelStyle={{ color: 'var(--text-primary)' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }} />
              {summary?.channels.map((ch, i) => (
                <Area
                  key={ch.channelId}
                  type="monotone"
                  dataKey={ch.channelName}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={`url(#grad${i})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── 중간 하단: 장르 + 수익 2열 차트 ── */}
      {!loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">장르별 프롬프트 수</h2>
            </div>
            <GenreChart data={genreData} />
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">플랫폼별 수익 비율</h2>
            </div>
            <RevenuePieChart data={revenuePieData} />
          </div>
        </div>
      )}

      {/* ── 하단: 채널별 비교 테이블 ── */}
      {!loading && hasChannels && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">채널별 비교</h2>
          </div>
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['채널명', '구독자', '총 조회수', '영상수', '참여율'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 12px',
                        textAlign: h === '채널명' ? 'left' : 'right',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary?.channels.map((ch, i) => (
                  <tr
                    key={ch.channelId}
                    style={{
                      borderBottom: i < (summary.channels.length - 1) ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {ch.thumbnailUrl ? (
                        <Image
                          src={ch.thumbnailUrl}
                          alt={ch.channelName}
                          width={28}
                          height={28}
                          style={{ borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: CHART_COLORS[i % CHART_COLORS.length],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            color: '#fff',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {ch.channelName[0]}
                        </div>
                      )}
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{ch.channelName}</span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {fmtNum(ch.subscriberCount)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {fmtNum(ch.totalViews)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {fmtNum(ch.videoCount)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <span
                        style={{
                          color: ch.engagementRate >= 3 ? '#38a169' : ch.engagementRate >= 1 ? '#d69e2e' : 'var(--text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        {ch.engagementRate.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
