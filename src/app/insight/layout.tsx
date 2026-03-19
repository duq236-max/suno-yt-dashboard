import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '인사이트 리포트 | Suno YT Manager',
  description: '채널 데이터 기반 AI 인사이트와 성장 전략 분석 리포트',
  openGraph: {
    title: '인사이트 리포트 | Suno YT Manager',
    description: '채널 데이터 기반 AI 인사이트와 성장 전략 분석 리포트',
    type: 'website',
  },
};

export default function InsightLayout({ children }: { children: React.ReactNode }) {
  return children;
}
