import { NextRequest, NextResponse } from 'next/server';
import { requireMentorAuth } from '@/lib/mentoring-auth';
import { isGoogleConfigured } from '@/lib/google-auth';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireMentorAuth(req);
    if (auth.error) {
      return auth.error;
    }

    const { mentorDocId } = auth;
    const configured = isGoogleConfigured();

    if (!configured) {
      return NextResponse.json({
        configured: false,
        connected: false,
        email: null,
        needsReconnect: false,
        message: 'Google integration is not configured on this server.',
      });
    }

    let connected = false;
    let email: string | null = null;
    let needsReconnect = false;

    if (adminDb) {
      const mentorDoc = await adminDb.collection('mentors').doc(mentorDocId).get();
      if (mentorDoc.exists) {
        const data = mentorDoc.data() || {};
        connected = Boolean(data.googleCalendarConnected);
        email = data.googleCalendarEmail || null;
        needsReconnect = Boolean(data.googleCalendarNeedsReconnect);
      } else {
        const userDoc = await adminDb.collection('users').doc(mentorDocId).get();
        if (userDoc.exists) {
          const data = userDoc.data() || {};
          connected = Boolean(data.googleCalendarConnected);
          email = data.googleCalendarEmail || null;
          needsReconnect = Boolean(data.googleCalendarNeedsReconnect);
        }
      }
    }

    return NextResponse.json({
      configured: true,
      connected,
      email,
      needsReconnect,
    });
  } catch (error: any) {
    console.error('[GoogleStatus] Error fetching status:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error checking Google status' }, { status: 500 });
  }
}
