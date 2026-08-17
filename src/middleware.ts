import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

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
    const JWKS = jose.createRemoteJWKSet(
      new URL('https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com')
    );

    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}`,
      audience: process.env.FIREBASE_PROJECT_ID,
    });

    const userId = payload.sub || payload.uid;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Invalid claims' }, { status: 401 });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', String(userId));

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch (err) {
    console.error("Middleware Auth Error:", err);
    return NextResponse.json({ error: 'Unauthorized: Token validation failed' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
