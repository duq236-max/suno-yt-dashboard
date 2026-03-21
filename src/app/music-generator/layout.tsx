import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '음악생성 | Suno YT Dashboard',
};

export default function MusicGeneratorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
