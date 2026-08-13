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

  // The middleware only acts as a basic routing gate now.
  // JWT verification and authorization are securely handled by the `authenticate()` helper in individual API routes.
  // This complies with Option A: adminAuth.verifyIdToken() in API Routes.
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
  }

  // Allow request through. Authorization is handled downstream.
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
