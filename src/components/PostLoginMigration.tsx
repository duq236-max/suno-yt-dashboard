'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { migrateFromLocalStorage } from '@/lib/supabase-storage';

/**
 * 로그인 직후 localStorage 데이터를 Supabase로 1회 마이그레이션.
 * Providers 내부에 마운트 → session이 생기면 자동 실행.
 */
export default function PostLoginMigration() {
  const { data: session } = useSession();
  const didMigrate = useRef(false);

  useEffect(() => {
    // 세션이 없거나 이미 실행한 경우 스킵
    if (!session?.user?.id || didMigrate.current) return;

    didMigrate.current = true;
    void migrateFromLocalStorage().then(({ migrated, error }) => {
      if (migrated) {
        console.info('[Migration] localStorage → Supabase 마이그레이션 완료');
      } else if (error) {
        console.warn('[Migration] 건너뜀:', error);
      }
    });
  }, [session?.user?.id]);

  return null;
}
