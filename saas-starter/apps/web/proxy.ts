import { auth } from '@saas/auth';
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = new Set(['/login', '/register', '/forgot-password', '/reset-password']);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/app') && !req.auth) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }
  if (req.auth && PUBLIC_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL('/app', req.nextUrl));
  }
});

export const config = {
  matcher: ['/app/:path*', '/login', '/register', '/forgot-password', '/reset-password'],
};
