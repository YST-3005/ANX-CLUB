import { google, calendar_v3 } from 'googleapis';
import { decryptToken } from '@/lib/security/encryption';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

export interface CalendarEventParams {
  sessionId: string;
  topic: string;
  description?: string;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM or HH:MM AM/PM
  durationMinutes: number;
  timeZone?: string;
  studentEmail: string;
  studentName: string;
  mentorEmail: string;
  mentorName: string;
  mentorId?: string;
  mentorRefreshToken?: string | null;
}

export interface GoogleCalendarMeetingResult {
  calendarEventId: string;
  meetingLink: string | null;
  conferenceStatus: 'confirmed' | 'pending_conference' | 'failed';
  errorMessage?: string;
}

export class GoogleCalendarError extends Error {
  public code: string;
  constructor(message: string, code = 'GOOGLE_CALENDAR_ERROR') {
    super(message);
    this.name = 'GoogleCalendarError';
    this.code = code;
  }
}

/**
 * Returns an authenticated Google OAuth2 client.
 * Strictly uses the mentor's individual stored refresh token.
 * Never falls back to a shared global refresh token.
 */
export function getOAuth2Client(mentorRefreshToken?: string | null) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    'http://localhost:3000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  if (mentorRefreshToken) {
    const decrypted = decryptToken(mentorRefreshToken);
    if (decrypted) {
      oauth2Client.setCredentials({ refresh_token: decrypted });
    } else {
      // Token cannot be decrypted (e.g. invalid key, corrupted, or unencrypted rejected)
      return null;
    }
  }

  return oauth2Client;
}

/**
 * Generates the Google OAuth authorization URL requesting minimal Calendar event permissions.
 */
export function getGoogleAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new GoogleCalendarError(
      'Google OAuth credentials not configured on server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).',
      'CREDENTIALS_MISSING'
    );
  }

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Mandatory to ensure Google returns a refresh_token
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  });
}

/**
 * Exchanges authorization code for OAuth tokens.
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new GoogleCalendarError(
      'Google OAuth credentials not configured on server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).',
      'CREDENTIALS_MISSING'
    );
  }

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Fetches user email associated with the OAuth credentials.
 */
export async function getGoogleUserEmail(auth: any): Promise<string | null> {
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth });
    const userinfo = await oauth2.userinfo.get();
    return userinfo.data.email || null;
  } catch {
    return null;
  }
}

/**
 * Parses date + time into ISO 8601 strings for Google Calendar API
 */
export function buildStartAndEndDateTime(
  date: string,
  startTimeStr: string,
  durationMinutes: number,
  timeZone = 'Asia/Kolkata'
): { startIso: string; endIso: string } {
  let hours = 10;
  let minutes = 0;

  const ampmMatch = startTimeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (ampmMatch) {
    hours = parseInt(ampmMatch[1], 10);
    minutes = parseInt(ampmMatch[2], 10);
    const ampm = ampmMatch[3]?.toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
  }

  const paddedH = hours.toString().padStart(2, '0');
  const paddedM = minutes.toString().padStart(2, '0');
  const startLocal = `${date}T${paddedH}:${paddedM}:00`;

  const startDate = new Date(startLocal);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  const endH = endDate.getHours().toString().padStart(2, '0');
  const endM = endDate.getMinutes().toString().padStart(2, '0');
  const endLocal = `${endDate.toISOString().split('T')[0]}T${endH}:${endM}:00`;

  return {
    startIso: startLocal,
    endIso: endLocal,
  };
}

/**
 * Creates a Google Calendar Event with Google Meet conference data.
 * Returns only genuine Google Meet links or honest pending/failed status. Never creates fake links.
 */
export async function createGoogleMeetConference(
  params: CalendarEventParams
): Promise<GoogleCalendarMeetingResult> {
  // Check mentor-specific authorization
  if (!params.mentorRefreshToken) {
    return {
      calendarEventId: `pending_evt_${params.sessionId}`,
      meetingLink: null,
      conferenceStatus: 'pending_conference',
      errorMessage:
        'Mentor has not connected their Google Calendar. Mentorship session scheduled, but Google Meet conference generation is awaiting mentor Calendar authorization.',
    };
  }

  const auth = getOAuth2Client(params.mentorRefreshToken);
  if (!auth) {
    return {
      calendarEventId: `pending_evt_${params.sessionId}`,
      meetingLink: null,
      conferenceStatus: 'pending_conference',
      errorMessage: 'Google OAuth client credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) not configured.',
    };
  }

  const calendar = google.calendar({ version: 'v3', auth });
  const timeZone = params.timeZone || 'Asia/Kolkata';
  const { startIso, endIso } = buildStartAndEndDateTime(
    params.scheduledDate,
    params.startTime,
    params.durationMinutes,
    timeZone
  );

  const requestId = `anx-meet-${params.sessionId}-${Date.now()}`;

  try {
    const res = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: `ANX Mentorship: ${params.topic}`,
        description: `${params.description || '1-on-1 Mentoring Session via ANX Platform'}\n\nMentor: ${params.mentorName} (${params.mentorEmail})\nStudent: ${params.studentName} (${params.studentEmail})`,
        start: {
          dateTime: `${startIso}+05:30`,
          timeZone,
        },
        end: {
          dateTime: `${endIso}+05:30`,
          timeZone,
        },
        attendees: [
          { email: params.studentEmail, displayName: params.studentName },
          { email: params.mentorEmail, displayName: params.mentorName },
        ],
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      },
    });

    const event = res.data;
    const calendarEventId = event.id || `evt_${params.sessionId}`;

    // Extract genuine Google Meet video conference link
    let meetingLink: string | null = null;
    if (event.conferenceData?.entryPoints) {
      const videoEntry = event.conferenceData.entryPoints.find(
        (ep) => ep.entryPointType === 'video' && ep.uri?.startsWith('https://meet.google.com/')
      );
      if (videoEntry?.uri) {
        meetingLink = videoEntry.uri;
      }
    }

    if (meetingLink) {
      return {
        calendarEventId,
        meetingLink,
        conferenceStatus: 'confirmed',
      };
    }

    return {
      calendarEventId,
      meetingLink: null,
      conferenceStatus: 'pending_conference',
      errorMessage: 'Calendar event created; waiting for Google Meet conference endpoint.',
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.error('[GoogleCalendar] Error creating Google Calendar meeting:', errMsg);

    const isRevoked =
      errMsg.includes('invalid_grant') ||
      err?.response?.data?.error === 'invalid_grant' ||
      err?.code === 401 ||
      err?.code === 403;

    if (isRevoked && params.mentorId) {
      console.warn(`[GoogleCalendar] Clearing revoked OAuth credentials for mentor ${params.mentorId}`);
      await mentorsRepository.clearGoogleOAuthTokens(params.mentorId).catch(() => {});
    }

    return {
      calendarEventId: `failed_evt_${params.sessionId}`,
      meetingLink: null,
      conferenceStatus: 'failed',
      errorMessage: isRevoked
        ? 'Mentor Google Calendar authorization was revoked or expired (invalid_grant). Please reconnect Google Calendar in Mentor Dashboard.'
        : `Google Calendar API error: ${errMsg}`,
    };
  }
}

/**
 * Updates an existing Google Calendar event for rescheduling or duration change
 */
export async function updateGoogleCalendarMeeting(params: {
  calendarEventId: string;
  topic?: string;
  scheduledDate: string;
  startTime: string;
  durationMinutes: number;
  timeZone?: string;
  mentorRefreshToken?: string | null;
  mentorId?: string;
}): Promise<boolean> {
  if (!params.mentorRefreshToken || !params.calendarEventId || params.calendarEventId.startsWith('pending_') || params.calendarEventId.startsWith('failed_')) {
    return false;
  }

  const auth = getOAuth2Client(params.mentorRefreshToken);
  if (!auth) return false;

  const calendar = google.calendar({ version: 'v3', auth });
  const timeZone = params.timeZone || 'Asia/Kolkata';
  const { startIso, endIso } = buildStartAndEndDateTime(
    params.scheduledDate,
    params.startTime,
    params.durationMinutes,
    timeZone
  );

  try {
    await calendar.events.patch({
      calendarId: 'primary',
      eventId: params.calendarEventId,
      requestBody: {
        ...(params.topic ? { summary: `ANX Mentorship: ${params.topic}` } : {}),
        start: { dateTime: `${startIso}+05:30`, timeZone },
        end: { dateTime: `${endIso}+05:30`, timeZone },
      },
    });
    return true;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.error('[GoogleCalendar] Failed to patch calendar event:', errMsg);
    if ((errMsg.includes('invalid_grant') || err?.code === 401) && params.mentorId) {
      await mentorsRepository.clearGoogleOAuthTokens(params.mentorId).catch(() => {});
    }
    return false;
  }
}

/**
 * Deletes a Google Calendar event on session cancellation
 */
export async function deleteGoogleCalendarMeeting(
  calendarEventId: string,
  mentorRefreshToken?: string | null,
  mentorId?: string
): Promise<boolean> {
  if (!mentorRefreshToken || !calendarEventId || calendarEventId.startsWith('pending_') || calendarEventId.startsWith('failed_')) {
    return false;
  }

  const auth = getOAuth2Client(mentorRefreshToken);
  if (!auth) return false;

  const calendar = google.calendar({ version: 'v3', auth });
  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: calendarEventId,
    });
    return true;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.error('[GoogleCalendar] Failed to delete calendar event:', errMsg);
    if ((errMsg.includes('invalid_grant') || err?.code === 401) && mentorId) {
      await mentorsRepository.clearGoogleOAuthTokens(mentorId).catch(() => {});
    }
    return false;
  }
}
