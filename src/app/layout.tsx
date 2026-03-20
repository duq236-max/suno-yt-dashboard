import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import AppShell from '@/components/AppShell';
import Providers from '@/components/Providers';
import { Analytics } from '@vercel/analytics/react';

export const metadata: Metadata = {
  title: 'Suno YT Manager — 유튜브 채널 반자동화 대시보드',
  description: 'Suno AI로 음악을 만들고 유튜브 채널을 효율적으로 운영하는 반자동화 대시보드',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={GeistSans.variable}>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
