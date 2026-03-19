import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '채널 기획 | Suno YT Manager',
  description: '채널 컨셉, 타겟 장르, 업로드 전략을 설계하는 채널 기획 도구',
  openGraph: {
    title: '채널 기획 | Suno YT Manager',
    description: '채널 컨셉, 타겟 장르, 업로드 전략을 설계하는 채널 기획 도구',
    type: 'website',
  },
};

export default function PlannerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
