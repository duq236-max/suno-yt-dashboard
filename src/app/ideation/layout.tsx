import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '아이디어 발굴 | Suno YT Manager',
  description: 'AI로 새로운 음악 컨셉과 채널 콘텐츠 아이디어를 발굴',
  openGraph: {
    title: '아이디어 발굴 | Suno YT Manager',
    description: 'AI로 새로운 음악 컨셉과 채널 콘텐츠 아이디어를 발굴',
    type: 'website',
  },
};

export default function IdeationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
