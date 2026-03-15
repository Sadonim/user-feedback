import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req: NextRequest & { auth: unknown }) => {
  const pathname = req.nextUrl.pathname;
  const isAdminPath = pathname.startsWith('/admin');
  const isLoginPath = pathname === '/admin/login';
  const isAuthenticated = !!(req as { auth?: { user?: unknown } }).auth?.user;

  if (isAdminPath && !isLoginPath && !isAuthenticated) {
    const loginUrl = new URL('/admin/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*'],
};
