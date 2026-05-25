import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ADMIN_PATHS = new Set<string>([
  '/admin/login',
  '/admin/login/verify',
  '/api/admin/auth/request-code',
  '/api/admin/auth/verify-code',
  '/api/admin/auth/logout',
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get('cv_admin_session')?.value;
  if (token) {
    return NextResponse.next();
  }

  // For API requests, return 401 JSON rather than redirecting.
  if (pathname.startsWith('/api/admin/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
