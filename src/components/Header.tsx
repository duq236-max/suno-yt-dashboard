'use client';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
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
                    <div className="user-avatar">S</div>
                    <span>Suno YT Manager</span>
                </div>
            </div>
        </header>
    );
}
