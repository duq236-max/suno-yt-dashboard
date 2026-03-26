'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

const RECENT_PAGES_KEY = 'recentPages';
const RECENT_MAX = 3;

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: string;
  badgeType?: 'new' | 'soon';
  tooltip?: string;
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
      { href: '/brand-kit', icon: '🎨', label: 'BrandKit', badge: 'NEW', badgeType: 'new' as const },
      { href: '/ideation', icon: '🧠', label: 'Ideation', badge: 'NEW', badgeType: 'new' as const },
      { href: '/lyrics', icon: '📝', label: 'Lyrics', badge: 'NEW', badgeType: 'new' as const },
      { href: '/cover', icon: '🖼️', label: 'Cover Generator', badge: 'NEW', badgeType: 'new' as const },
      { href: '/library', icon: '📚', label: '프롬프트 라이브러리', badge: 'NEW', badgeType: 'new' as const },
    ],
  },
  {
    section: '🎵 음원 제작',
    items: [
      { href: '/music-generator', icon: '🎵', label: '음악생성', badge: 'NEW', badgeType: 'new' as const },
      { href: '/cover-image-generator', icon: '🖼', label: '커버이미지', badge: 'NEW', badgeType: 'new' as const },
      { href: '/seo-package', icon: '🔍', label: 'SEO패키지', badge: 'NEW', badgeType: 'new' as const },
    ],
  },
  {
    section: '추후 예정',
    items: [
      { href: '#', icon: '🤖', label: '자동 주입 (B안)', badge: 'SOON', badgeType: 'soon', tooltip: '준비중입니다' },
      { href: '#', icon: '📡', label: '라이브 스트리밍', badge: 'SOON', badgeType: 'soon', tooltip: '준비중입니다' },
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
  const [recentPages, setRecentPages] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(RECENT_PAGES_KEY) ?? '[]') as string[];
    } catch { return []; }
  });

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

  // 현재 경로를 최근 방문 목록에 저장 (최대 3개)
  useEffect(() => {
    if (!pathname || pathname === '#') return;
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_PAGES_KEY) ?? '[]') as string[];
      const updated = [pathname, ...stored.filter((p) => p !== pathname)].slice(0, RECENT_MAX);
      localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(updated));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecentPages(updated);
    } catch { /* ignore */ }
  }, [pathname]);

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
                onClick={item.href === '#' ? (e) => e.preventDefault() : undefined}
                aria-disabled={item.href === '#' ? true : undefined}
                title={item.tooltip}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
                {item.href !== '#' && recentPages.includes(item.href) && pathname !== item.href && (
                  <span className="sidebar-badge" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                    최근
                  </span>
                )}
                {item.badge && !(item.href !== '#' && recentPages.includes(item.href) && pathname !== item.href) && (
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
