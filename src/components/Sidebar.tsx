'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useRef } from 'react';

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: string;
  badgeType?: 'new' | 'soon';
}

const navItems: { section: string; items: NavItem[] }[] = [
  {
    section: '메인',
    items: [
      { href: '/dashboard', icon: '🏠', label: '대시보드' },
    ],
  },
  {
    section: '콘텐츠',
    items: [
      { href: '/scrapsheet', icon: '✂️', label: '스크랩시트' },
      { href: '/planner', icon: '💡', label: '채널기획' },
      { href: '/schedule', icon: '🗓️', label: '스케쥴 알림' },
    ],
  },
  {
    section: '분석',
    items: [
      { href: '/statistics', icon: '📈', label: '통합 통계', badge: 'NEW', badgeType: 'new' },
      { href: '/audit', icon: '📊', label: '채널 감사', badge: 'NEW', badgeType: 'new' },
      { href: '/insight', icon: '🔍', label: '딥 인사이트', badge: 'NEW', badgeType: 'new' },
      { href: '/videos', icon: '🎬', label: '영상 목록', badge: 'NEW', badgeType: 'new' },
      { href: '/comments', icon: '💬', label: '댓글 관리', badge: 'NEW', badgeType: 'new' },
      { href: '/revenue', icon: '💰', label: '수익 관리', badge: 'NEW', badgeType: 'new' },
    ],
  },
  {
    section: '크리에이티브',
    items: [
      { href: '/brand-kit', icon: '🎨', label: 'BrandKit', badge: 'NEW', badgeType: 'new' },
      { href: '/ideation', icon: '🧠', label: 'Ideation', badge: 'NEW', badgeType: 'new' },
      { href: '/lyrics', icon: '📝', label: 'Lyrics', badge: 'NEW', badgeType: 'new' },
      { href: '/cover', icon: '🎨', label: 'Cover Generator', badge: 'NEW', badgeType: 'new' },
      { href: '/library', icon: '📚', label: '프롬프트 라이브러리', badge: 'NEW', badgeType: 'new' },
    ],
  },
  {
    section: '추후 예정',
    items: [
      { href: '#', icon: '🤖', label: '자동 주입 (B안)', badge: 'SOON', badgeType: 'soon' },
      { href: '#', icon: '📡', label: '라이브 스트리밍', badge: 'SOON', badgeType: 'soon' },
    ],
  },
];

const footerItems = [
  { href: '/settings', icon: '⚙️', label: '계정 설정' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose?.();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleMouseDown);
    }
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, onClose]);

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`} ref={ref}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🎵</div>
        <div className="sidebar-logo-text">
          Suno<span>YT</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.section}>
            <div className="sidebar-section-label">{section.section}</div>
            {section.items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`sidebar-link ${pathname === item.href || (item.href !== '#' && pathname.startsWith(item.href) && item.href !== '/') ? 'active' : ''}`}
                style={item.href === '#' ? { pointerEvents: 'none', opacity: 0.5 } : {}}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
                {item.badge && (
                  <span className={`sidebar-badge ${item.badgeType || ''}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {footerItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {/* 유저 프로필 / 로그아웃 */}
        {session?.user ? (
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px' }}>
              {session.user.image ? (
                <Image src={session.user.image} alt="" width={24} height={24} style={{ borderRadius: '50%' }} />
              ) : (
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: 700 }}>
                  {session.user.name?.[0] ?? '?'}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session.user.name}
                </div>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="sidebar-link"
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <span className="icon">🚪</span>
              로그아웃
            </button>
          </div>
        ) : (
          <Link href="/login" className="sidebar-link" style={{ marginTop: '8px' }}>
            <span className="icon">🔑</span>
            로그인
          </Link>
        )}
      </div>
    </aside>
  );
}
