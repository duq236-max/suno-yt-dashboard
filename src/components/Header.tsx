'use client';

import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
    const { data: session, status } = useSession();

    const user = session?.user;
    const initial = user?.name?.charAt(0).toUpperCase() ?? 'S';
    const displayName = user?.name ?? 'Suno YT Manager';

    return (
        <header className="header">
            <div className="header-left">
                <div>
                    <div className="header-title">{title}</div>
                    {subtitle && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {subtitle}
                        </div>
                    )}
                </div>
            </div>
            <div className="header-right">
                <div className="user-badge">
                    {status === 'authenticated' && user?.image ? (
                        <Image
                            src={user.image}
                            alt={displayName}
                            width={32}
                            height={32}
                            className="user-avatar"
                            style={{ borderRadius: '50%', objectFit: 'cover' }}
                        />
                    ) : (
                        <div className="user-avatar">{initial}</div>
                    )}
                    <span>{displayName}</span>
                    {status === 'authenticated' && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            style={{ marginLeft: '8px', fontSize: '12px' }}
                        >
                            로그아웃
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
