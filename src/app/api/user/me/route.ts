import { auth } from '@/auth';
import { NextResponse } from 'next/server';

/**
 * GET /api/user/me
 * 현재 NextAuth 세션의 user.id를 반환.
 * supabase-storage.ts의 getCurrentUserId()가 클라이언트 컨텍스트에서 호출.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ userId: null }, { status: 401 });
  }

  return NextResponse.json({ userId: session.user.id });
}
