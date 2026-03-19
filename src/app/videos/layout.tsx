import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '영상 관리 | Suno YT Manager',
  description: '업로드된 유튜브 영상 목록을 조회하고 성과를 추적',
  openGraph: {
    title: '영상 관리 | Suno YT Manager',
    description: '업로드된 유튜브 영상 목록을 조회하고 성과를 추적',
    type: 'website',
  },
};

export default function VideosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
