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
    path === '/api/v1/community' ||
    path === '/api/v1/resources' ||
    path.startsWith('/api/v1/resources/') ||
    path === '/api/career/resume-review' ||
    path.startsWith('/api/roadmaps') ||
    path.startsWith('/api/events') ||
    path.startsWith('/api/mentors') ||
    path.startsWith('/api/announcements')
  );

  const isPublicAuth = path.startsWith('/api/v1/auth') || path.startsWith('/api/auth');
  const isAISearch = path.startsWith('/api/v1/ai-search') || path.startsWith('/api/ai-search');
  const isPayment = path.startsWith('/api/v1/payments') || path.startsWith('/api/razorpay');

  if (isPublicGet || isPublicAuth || isAISearch || isPayment) {
    return NextResponse.next();
  }

  let token = '';
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1]?.trim();
  } else {
    const sessionCookie = request.cookies.get('session') || request.cookies.get('__session') || request.cookies.get('anx_admin');
    if (sessionCookie) token = sessionCookie.value?.trim();
  }

  if (!token) {
    return NextResponse.next();
  }

  // Strip untrusted client-supplied identity headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-user-id');

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    '/api/v1/:path*', 
    '/api/incubation/:path*', 
    '/api/certificates/:path*', 
    '/api/cron/:path*', 
    '/api/gamification/:path*', 
    '/api/internships/:path*', 
    '/api/referrals/:path*', 
    '/api/career/:path*', 
    '/api/partners/:path*', 
    '/api/discord/:path*'
  ],
};
