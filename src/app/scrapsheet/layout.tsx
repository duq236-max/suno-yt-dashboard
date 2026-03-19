import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '스크랩시트 | Suno YT Manager',
  description: 'Suno AI 프롬프트와 가사를 시트 단위로 정리하고 관리',
  openGraph: {
    title: '스크랩시트 | Suno YT Manager',
    description: 'Suno AI 프롬프트와 가사를 시트 단위로 정리하고 관리',
    type: 'website',
  },
};

export default function ScrapsheetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
