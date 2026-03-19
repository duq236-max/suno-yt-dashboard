import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '가사 생성 | Suno YT Manager',
  description: 'Gemini AI로 Suno 스타일의 가사를 자동 생성하고 관리',
  openGraph: {
    title: '가사 생성 | Suno YT Manager',
    description: 'Gemini AI로 Suno 스타일의 가사를 자동 생성하고 관리',
    type: 'website',
  },
};

export default function LyricsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
