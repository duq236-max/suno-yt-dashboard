import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // 마스터 계정 (개발용 — Google OAuth 없이 즉시 로그인)
    Credentials({
      id: 'master',
      name: 'Master',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      authorize(credentials) {
        if (credentials?.password === process.env.MASTER_PASSWORD) {
          return {
            id: 'master',
            name: 'Master',
            email: process.env.MASTER_EMAIL ?? 'master@local',
          };
        }
        return null;
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
  },
});
