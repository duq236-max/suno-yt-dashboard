import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '설정 | Suno YT Manager',
  description: 'Gemini API 키, YouTube 연동, 알림 등 앱 설정을 관리',
  openGraph: {
    title: '설정 | Suno YT Manager',
    description: 'Gemini API 키, YouTube 연동, 알림 등 앱 설정을 관리',
    type: 'website',
  },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
