'use client';

import { SessionProvider } from 'next-auth/react';
import PostLoginMigration from '@/components/PostLoginMigration';
import { ToastProvider } from '@/components/Toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <PostLoginMigration />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
