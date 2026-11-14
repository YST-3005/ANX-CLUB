export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  role: string;
  membershipType: string;
  collegeName?: string;
  xpTotal: number;
  leadershipStage: string;
  avatarUrl?: string;
}

export type MentorRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface MentorRequestDto {
  id: string;
  studentId: string;
  mentorId: string;
  topic: string;
  message?: string;
  status: MentorRequestStatus;
  declineReason?: string;
  isPaid: boolean;
  amount: number;
  version: number;
  createdAt: number;
  updatedAt: number;
  studentName?: string;
  studentEmail?: string;
  mentorName?: string;
  mentorEmail?: string;
  mentorTitle?: string;
  mentorCompany?: string;
  mentorAvatar?: string;
}

export type MentoringSessionStatus =
  | 'pending_conference'
  | 'confirmed'
  | 'rescheduled'
  | 'cancelled'
  | 'completed';

export interface MentoringSessionDto {
  id: string;
  requestId: string;
  studentId: string;
  mentorId: string;
  topic: string;
  description?: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  timeZone: string;
  status: MentoringSessionStatus;
  calendarEventId?: string;
  meetingLink?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  studentName?: string;
  studentEmail?: string;
  mentorName?: string;
  mentorEmail?: string;
  mentorTitle?: string;
  mentorCompany?: string;
  mentorAvatar?: string;
}

export interface MentorCardDto {
  id: string;
  userId?: string;
  fullName: string;
  email: string;
  title: string;
  company?: string;
  bio?: string;
  avatarUrl?: string;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  skills: string[];
  isAvailable: boolean;
  isPremiumOnly: boolean;
  experienceYears: number;
}

export interface DeltaSyncPayload {
  serverTimestamp: number;
  hasMore: boolean;
  changes: {
    events: any[];
    registrations: any[];
    mentorRequests: MentorRequestDto[];
    mentoringSessions: MentoringSessionDto[];
    tombstones: { entityType: string; entityId: string; deletedAt: number }[];
  };
}
