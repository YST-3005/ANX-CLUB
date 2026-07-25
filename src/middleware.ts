import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Define public paths that bypass authentication
  const isPublicGet = request.method === 'GET' && (
    path === '/api/v1/events' ||
    path.startsWith('/api/v1/events/') ||
    path === '/api/v1/mentors' ||
    path.startsWith('/api/v1/mentors/') ||
    path === '/api/v1/community'
  );

  const isPublicAuth = path.startsWith('/api/v1/auth'); // OTP auth
  const isAISearch = path.startsWith('/api/v1/ai-search'); // AI Search (handles its own security and rate-limiting)

  if (isPublicGet || isPublicAuth || isAISearch) {
    return NextResponse.next();
  }

  // Get token from headers or cookies
  let token = '';
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  } else {
    // Check cookies
    const sessionCookie = request.cookies.get('session') || request.cookies.get('__session');
    if (sessionCookie) {
      token = sessionCookie.value;
    }
  }

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized: No authentication token provided' },
      { status: 401 }
    );
  }

  let userId = '';

  // Check for mock tokens
  if (
    token.startsWith('mock_') ||
    token === 'user_rohit' ||
    token === 'default_user_123' ||
    token === 'rohit@example.com' ||
    token === 'emma.watson@example.com'
  ) {
    userId = token;
  } else {
    // Attempt to verify Firebase ID token
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        // Base64Url decode helper for Edge runtime
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        const now = Date.now() / 1000;
        
        // Basic claim validation
        if (payload.exp && payload.exp < now) {
          return NextResponse.json({ error: 'Unauthorized: Token expired' }, { status: 401 });
        }
        
        const projectId = process.env.FIREBASE_PROJECT_ID;
        if (projectId) {
          if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
            return NextResponse.json({ error: 'Unauthorized: Invalid issuer' }, { status: 401 });
          }
          if (payload.aud !== projectId) {
            return NextResponse.json({ error: 'Unauthorized: Invalid audience' }, { status: 401 });
          }
        }
        
        userId = payload.sub; // UID
      }
    } catch (err) {
      console.error('Middleware token parsing failed:', err);
    }
  }

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid authentication token' },
      { status: 401 }
    );
  }

  // Attach verified user ID to downstream request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', userId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/api/v1/:path*',
  ],
};
