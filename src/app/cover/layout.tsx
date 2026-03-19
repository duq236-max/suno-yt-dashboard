import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '커버 생성 | Suno YT Manager',
  description: 'AI로 유튜브 썸네일과 앨범 커버 이미지를 자동 생성',
  openGraph: {
    title: '커버 생성 | Suno YT Manager',
    description: 'AI로 유튜브 썸네일과 앨범 커버 이미지를 자동 생성',
    type: 'website',
  },
};

export default function CoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
