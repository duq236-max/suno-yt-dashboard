import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // NextAuth 내부 경로는 항상 허용
  if (pathname.startsWith('/api/auth')) return NextResponse.next();

  // 비로그인 → /login 리다이렉트 (로그인 페이지 자체는 제외)
  if (!isLoggedIn && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 로그인 상태에서 /login 접근 → /dashboard 리다이렉트
  if (isLoggedIn && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
