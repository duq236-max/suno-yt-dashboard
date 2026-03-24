import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'SEO 최적화 패키지 | Suno YT Dashboard',
};

export default function SeoPackageLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
