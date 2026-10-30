/**
 * Unified Mentoring Workflow Data Types
 * Standardized across Student Portal, Mentor Portal, and Background Jobs.
 */

export type MentoringRequestStatus =
  | 'pending'
  | 'accepted_awaiting_scheduling'
  | 'declined'
  | 'scheduled'
  | 'cancelled';

export type MentoringSessionStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export type ConferenceStatus =
  | 'pending'
  | 'pending_scheduling'
  | 'scheduling_pending_google'
  | 'confirmed'
  | 'failed'
  | 'not_requested';

export type SyncStatus =
  | 'pending'
  | 'synced'
  | 'failed'
  | 'not_connected';

export interface AuditEntry {
  action: string;
  performedBy: string;
  performedByRole?: 'student' | 'mentor' | 'admin' | 'system';
  timestamp: string; // ISO 8601 UTC
  notes?: string;
}

/**
 * mentorRequests: Source of truth for request lifecycle
 */
export interface MentorRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  mentorId: string;
  mentorName: string;
  mentorEmail?: string;
  topic: string;
  message: string;
  preferredDate?: string;
  preferredTime?: string;
  preferredTimes?: string[];
  status: MentoringRequestStatus;
  declineReason?: string;
  sessionId?: string;
  isPaid?: boolean;
  amount?: number;
  history?: AuditEntry[];
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC

  // Compatibility aliases
  memberId?: string;
  userId?: string;
  memberName?: string;
  memberEmail?: string;
}

/**
 * mentoringSessions: Single source of truth for scheduled sessions & Google Calendar events
 */
export interface MentoringSession {
  id: string;
  requestId: string;
  mentorId: string;
  mentorName: string;
  mentorEmail: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  topic: string;
  description?: string;
  startAtUTC: string; // ISO 8601 UTC string (e.g. 2026-11-05T14:00:00.000Z)
  durationMin: number; // 30, 45, 60
  status: MentoringSessionStatus;
  googleEventId: string | null;
  meetLink: string | null; // Valid ONLY when conferenceStatus === 'confirmed'
  conferenceStatus: ConferenceStatus;
  syncStatus: SyncStatus;
  syncError: string | null;
  cancelReason?: string;
  rescheduleReason?: string;
  history: AuditEntry[];
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC

  // Compatibility aliases
  memberId?: string;
  userId?: string;
}

/**
 * Mentor Public & Private Profile
 */
export interface MentorProfile {
  id: string;
  uid?: string;
  name: string;
  role: string;
  company: string;
  bio: string;
  expertise?: string[];
  skills: string[];
  topics?: string[];
  hourlyRate: number;
  rating: number;
  totalReviews: number;
  sessionsCompleted: number;
  avatarUrl?: string;
  ownerEmail?: string;
  timezone?: string;
  availableDays?: string[];
  availableHours?: {
    start: string; // e.g. "09:00"
    end: string;   // e.g. "18:00"
  };
  googleCalendarConnected?: boolean;
  googleCalendarNeedsReconnect?: boolean;
  googleCalendarEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}
