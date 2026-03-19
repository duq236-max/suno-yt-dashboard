import type { DefaultSession } from 'next-auth';

// session.user.id 타입 확장
// auth.ts callbacks.session에서 token.sub → session.user.id 매핑
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}
