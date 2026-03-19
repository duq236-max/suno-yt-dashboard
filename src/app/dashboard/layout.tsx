import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '대시보드 | Suno YT Manager',
  description: '채널 통계, 영상 목록, 스크랩시트 현황을 한눈에 확인하는 메인 대시보드',
  openGraph: {
    title: '대시보드 | Suno YT Manager',
    description: '채널 통계, 영상 목록, 스크랩시트 현황을 한눈에 확인하는 메인 대시보드',
    type: 'website',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
