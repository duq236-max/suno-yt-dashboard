import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '브랜드 킷 | Suno YT Manager',
  description: '채널 로고, 색상, 폰트 등 브랜드 아이덴티티 자산을 관리',
  openGraph: {
    title: '브랜드 킷 | Suno YT Manager',
    description: '채널 로고, 색상, 폰트 등 브랜드 아이덴티티 자산을 관리',
    type: 'website',
  },
};

export default function BrandKitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
