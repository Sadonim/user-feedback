import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sanitizeCallbackUrl } from '@/lib/auth/sanitize-callback-url';

export default auth((req: NextRequest & { auth: unknown }) => {
  const pathname = req.nextUrl.pathname;
  const isAdminPath = pathname.startsWith('/admin');
  const isLoginPath = pathname === '/admin/login';
  const isAuthenticated = !!(req as { auth?: { user?: unknown } }).auth?.user;

  if (isAdminPath && !isLoginPath && !isAuthenticated) {
    const loginUrl = new URL('/admin/login', req.url);
    // [H1] pathname은 Next.js 라우팅에서 오는 값이지만 방어적으로 sanitize 적용
    loginUrl.searchParams.set('callbackUrl', sanitizeCallbackUrl(pathname));
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
