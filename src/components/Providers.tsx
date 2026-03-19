'use client';

import { SessionProvider } from 'next-auth/react';
import PostLoginMigration from '@/components/PostLoginMigration';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PostLoginMigration />
      {children}
    </SessionProvider>
  );
}
