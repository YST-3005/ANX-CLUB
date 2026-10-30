import { google, calendar_v3 } from 'googleapis';
import { getMentorOAuthClient, isGoogleConfigured } from '@/lib/google-auth';

export interface CalendarEventPayload {
  sessionId: string;
  mentorUid: string;
  mentorEmail: string;
  studentEmail: string;
  studentName?: string;
  mentorName?: string;
  topic: string;
  notes?: string;
  startAtUTC: string;
  durationMin: number;
}

export interface CalendarOperationResult {
  success: boolean;
  googleEventId?: string | null;
  meetLink?: string | null;
  conferenceStatus: 'confirmed' | 'failed' | 'pending_scheduling';
  syncStatus: 'synced' | 'failed' | 'not_connected';
  syncError?: string | null;
}

/**
 * Creates a real Google Calendar event with Hangouts/Google Meet conference data.
 * Validates that Google Meet is strictly confirmed before returning the link.
 */
export async function createGoogleCalendarEvent(
  payload: CalendarEventPayload
): Promise<CalendarOperationResult> {
  if (!isGoogleConfigured()) {
    return {
      success: false,
      conferenceStatus: 'pending_scheduling',
      syncStatus: 'not_connected',
      syncError: 'Google integration not configured on this server.',
    };
  }

  const oauthClient = await getMentorOAuthClient(payload.mentorUid);
  if (!oauthClient) {
    return {
      success: false,
      conferenceStatus: 'pending_scheduling',
      syncStatus: 'not_connected',
      syncError: 'Mentor has not connected their Google Calendar.',
    };
  }

  const calendar = google.calendar({ version: 'v3', auth: oauthClient as any });
  const start = new Date(payload.startAtUTC);
  const end = new Date(start.getTime() + payload.durationMin * 60 * 1000);

  const attendees: calendar_v3.Schema$EventAttendee[] = [];
  if (payload.mentorEmail) {
    attendees.push({ email: payload.mentorEmail, displayName: payload.mentorName || 'Mentor', responseStatus: 'accepted' });
  }
  if (payload.studentEmail) {
    attendees.push({ email: payload.studentEmail, displayName: payload.studentName || 'Student' });
  }

  const requestId = `anx-session-${payload.sessionId}-${Date.now()}`;

  const eventRequestBody: calendar_v3.Schema$Event = {
    summary: `A.N.X Mentoring: ${payload.topic || 'Mentorship Session'}`,
    description: `Mentoring session on the A.N.X Platform.\nTopic: ${payload.topic || 'Mentorship Session'}\nNotes: ${payload.notes || 'None provided'}\nStudent: ${payload.studentName || 'Student'} (${payload.studentEmail})\nMentor: ${payload.mentorName || 'Mentor'} (${payload.mentorEmail})`,
    start: {
      dateTime: start.toISOString(),
    },
    end: {
      dateTime: end.toISOString(),
    },
    attendees,
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
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 10 },
      ],
    },
  };

  try {
    const insertRes = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: eventRequestBody,
    });

    let event = insertRes.data;
    const googleEventId = event.id || null;

    // Polling loop if conferenceData creation is still in pending status
    let attempts = 0;
    while (
      event.conferenceData?.createRequest?.status?.statusCode === 'pending' &&
      attempts < 3 &&
      googleEventId
    ) {
      attempts++;
      // Wait 600ms before re-fetching
      await new Promise((resolve) => setTimeout(resolve, 600));
      try {
        const getRes = await calendar.events.get({
          calendarId: 'primary',
          eventId: googleEventId,
        });
        event = getRes.data;
      } catch (pollErr) {
        console.warn(`[GoogleCalendar] Poll retry ${attempts} failed:`, pollErr);
      }
    }

    const statusCode = event.conferenceData?.createRequest?.status?.statusCode;
    const hangoutLink = event.hangoutLink;
    const entryPointUri = event.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video'
    )?.uri;

    const validatedMeetLink = (statusCode === 'success' || statusCode === undefined) && (hangoutLink || entryPointUri);

    if (validatedMeetLink) {
      return {
        success: true,
        googleEventId,
        meetLink: hangoutLink || entryPointUri || null,
        conferenceStatus: 'confirmed',
        syncStatus: 'synced',
      };
    }

    // If conferenceData failed or remains pending
    const statusError =
      statusCode === 'failure'
        ? 'Google Meet creation rejected by Google Workspace.'
        : 'Google Meet creation timed out. Retry is available.';

    return {
      success: false,
      googleEventId,
      meetLink: null,
      conferenceStatus: 'failed',
      syncStatus: 'failed',
      syncError: statusError,
    };
  } catch (error: any) {
    console.error('[GoogleCalendar] Error creating calendar event:', error?.message || error);
    return {
      success: false,
      meetLink: null,
      conferenceStatus: 'failed',
      syncStatus: 'failed',
      syncError: error?.message || 'Google Calendar API error',
    };
  }
}

/**
 * Patches an existing calendar event (reschedule / duration change) on the SAME event ID.
 */
export async function patchGoogleCalendarEvent(
  mentorUid: string,
  googleEventId: string,
  newStartAtUTC: string,
  newDurationMin: number
): Promise<{ success: boolean; syncError?: string }> {
  if (!isGoogleConfigured() || !googleEventId) {
    return { success: false, syncError: 'Google integration not configured or missing event ID.' };
  }

  const oauthClient = await getMentorOAuthClient(mentorUid);
  if (!oauthClient) {
    return { success: false, syncError: 'Mentor Google credentials unavailable.' };
  }

  const calendar = google.calendar({ version: 'v3', auth: oauthClient as any });
  const start = new Date(newStartAtUTC);
  const end = new Date(start.getTime() + newDurationMin * 60 * 1000);

  try {
    await calendar.events.patch({
      calendarId: 'primary',
      eventId: googleEventId,
      requestBody: {
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error(`[GoogleCalendar] Error patching event ${googleEventId}:`, error?.message || error);
    return { success: false, syncError: error?.message || 'Failed to update Google Calendar event' };
  }
}

/**
 * Deletes a calendar event upon cancellation.
 */
export async function deleteGoogleCalendarEvent(
  mentorUid: string,
  googleEventId: string
): Promise<{ success: boolean }> {
  if (!isGoogleConfigured() || !googleEventId) {
    return { success: false };
  }

  const oauthClient = await getMentorOAuthClient(mentorUid);
  if (!oauthClient) {
    return { success: false };
  }

  const calendar = google.calendar({ version: 'v3', auth: oauthClient as any });

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
    });
    return { success: true };
  } catch (error: any) {
    // If event was already deleted (404/410), treat as non-fatal success
    if (error?.code === 404 || error?.code === 410) {
      return { success: true };
    }
    console.error(`[GoogleCalendar] Error deleting event ${googleEventId}:`, error?.message || error);
    return { success: false };
  }
}
