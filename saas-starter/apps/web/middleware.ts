import { auth } from '@saas/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/reset-password');
  const isAppPage = pathname.startsWith('/app');
  const isPublic = pathname === '/' || pathname.startsWith('/api/auth') || pathname === '/favicon.ico';

  let res: NextResponse;

  if (isPublic || isAuthPage) {
    res = NextResponse.next();
  } else if (isAppPage && !req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    res = NextResponse.redirect(loginUrl);
  } else {
    res = NextResponse.next();
  }

  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );

  return res;
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
