import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = new Set<string>([
  '/login',
  '/api/login',
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/screenshots')
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.has(pathname);
  const auth = req.cookies.get('auth')?.value;
  const isAuthed = auth === 'ok';

  if (isPublic) {
    // If already authed, redirect away from /login
    if (pathname === '/login' && isAuthed) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    // Optional: keep original destination to redirect back after login
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
