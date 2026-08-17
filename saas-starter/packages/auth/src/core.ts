import NextAuth, { type NextAuthResult } from 'next-auth';
import { authConfig } from './config.js';

const result = NextAuth(authConfig);

export const auth: NextAuthResult['auth'] = result.auth;
export const handlers: NextAuthResult['handlers'] = result.handlers;
export const signIn: NextAuthResult['signIn'] = result.signIn;
export const signOut: NextAuthResult['signOut'] = result.signOut;
export { authConfig };
