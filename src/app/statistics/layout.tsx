import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '통합 통계 | Suno YT Dashboard',
  description: '멀티채널 구독자·조회수·참여율 통합 분석 대시보드',
  openGraph: {
    title: '통합 통계 | Suno YT Dashboard',
    description: '멀티채널 구독자·조회수·참여율 통합 분석 대시보드',
    type: 'website',
  },
};

export default function StatisticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
