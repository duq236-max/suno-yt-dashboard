'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

// 사이드바가 필요 없는 경로 (로그인 페이지 등)
const NO_SHELL_PATHS = ['/login'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const noShell = NO_SHELL_PATHS.some((p) => pathname.startsWith(p));

  if (noShell) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="메뉴 열기"
      >
        ☰
      </button>
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
