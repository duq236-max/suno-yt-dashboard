import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '업로드 스케줄 | Suno YT Manager',
  description: '유튜브 업로드 일정을 계획하고 자동 알림을 설정',
  openGraph: {
    title: '업로드 스케줄 | Suno YT Manager',
    description: '유튜브 업로드 일정을 계획하고 자동 알림을 설정',
    type: 'website',
  },
};

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
