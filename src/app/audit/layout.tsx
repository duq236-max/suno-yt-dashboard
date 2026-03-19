import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '채널 감사 | Suno YT Manager',
  description: 'AI가 채널 성과를 분석하고 개선 방향을 제안하는 채널 감사 리포트',
  openGraph: {
    title: '채널 감사 | Suno YT Manager',
    description: 'AI가 채널 성과를 분석하고 개선 방향을 제안하는 채널 감사 리포트',
    type: 'website',
  },
};

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return children;
}
