import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname;

  const isPublicGet = request.method === 'GET' && (
    path === '/api/v1/events' ||
    path.startsWith('/api/v1/events/') ||
    path === '/api/v1/mentors' ||
    path.startsWith('/api/v1/mentors/') ||
    path === '/api/v1/community'
  );

  const isPublicAuth = path.startsWith('/api/v1/auth');
  const isAISearch = path.startsWith('/api/v1/ai-search');

  if (isPublicGet || isPublicAuth || isAISearch) {
    return NextResponse.next();
  }

  let token = '';
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  } else {
    const sessionCookie = request.cookies.get('session') || request.cookies.get('__session');
    if (sessionCookie) token = sessionCookie.value;
  }

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Unauthorized: Malformed JWT' }, { status: 401 });
    }

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return NextResponse.json({ error: 'Unauthorized: Token expired' }, { status: 401 });
    }

    const userId = payload.sub || payload.uid;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Invalid claims' }, { status: 401 });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', userId);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized: Token validation failed' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
