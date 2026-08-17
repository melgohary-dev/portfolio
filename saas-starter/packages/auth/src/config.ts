import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import { z } from 'zod';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const providers = [
  Credentials({
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) {
        return null;
      }
      const { email, password } = parsed.data;
      const { getUserByEmail } = await import('./db.js');
      const user = await getUserByEmail(email);
      if (!user?.passwordHash) {
        return null;
      }
      const { verifyPassword } = await import('./password.js');
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) {
        return null;
      }
      return { id: user.id, email: user.email, name: user.name };
    },
  }),
  ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET ? [GitHub] : []),
];

export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers,
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.uid = user.id;
      }
      if (trigger === 'update' && session) {
        // Whitelist, never Object.assign: a client-triggered update may only
        // write the keys below. Anything else is silently ignored.
        if (session.currentOrgId !== undefined) {
          token.currentOrgId = session.currentOrgId;
        }
        if (typeof session.name === 'string') {
          token.name = session.name;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string | undefined) ?? '';
        session.user.name = session.user.name ?? (token.name as string | null | undefined) ?? null;
        session.user.email =
          session.user.email ?? (token.email as string | null | undefined) ?? null;
      }
      session.currentOrgId = token.currentOrgId as string | undefined;
      return session;
    },
  },
};
