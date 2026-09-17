import { auth } from '@saas/auth';
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = new Set(['/login', '/register', '/forgot-password', '/reset-password']);

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  let res: NextResponse;

  if (pathname.startsWith('/app') && !req.auth) {
    res = NextResponse.redirect(new URL('/login', req.nextUrl));
  } else if (req.auth && PUBLIC_PATHS.has(pathname)) {
    res = NextResponse.redirect(new URL('/app', req.nextUrl));
  } else {
    res = NextResponse.next();
  }

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};