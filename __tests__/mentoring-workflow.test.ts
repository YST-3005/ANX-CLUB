import { db } from '../src/lib/turso/client';
import { usersRepository } from '../src/lib/turso/repositories/usersRepository';
import { requestsRepository } from '../src/lib/turso/repositories/requestsRepository';
import { sessionsRepository } from '../src/lib/turso/repositories/sessionsRepository';

describe('Mentoring Workflow & ACID State Machine', () => {
  const timestamp = Date.now();
  const studentId = `test_student_${timestamp}`;
  const mentorUserId = `test_mentor_user_${timestamp}`;
  const mentorId = `test_mentor_${timestamp}`;

  beforeAll(async () => {
    // 1. Create student user
    await usersRepository.create({
      id: studentId,
      email: `student_${timestamp}@anxclub.com`,
      full_name: 'Workflow Student',
      role: 'member',
    });

    // 2. Create mentor user
    await usersRepository.create({
      id: mentorUserId,
      email: `mentor_${timestamp}@anxclub.com`,
      full_name: 'Workflow Mentor',
      role: 'mentor',
    });

    // 3. Create mentor entity
    await db.execute({
      sql: `INSERT INTO mentors (id, user_id, full_name, email, title, company, bio, skills_json, is_available, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [
        mentorId,
        mentorUserId,
        'Workflow Mentor',
        `mentor_${timestamp}@anxclub.com`,
        'Staff Architect',
        'Google',
        'Cloud and edge specialist',
        JSON.stringify(['Next.js', 'Distributed Systems']),
        timestamp,
        timestamp,
      ],
    });
  });

  afterAll(async () => {
    try {
      await db.execute({ sql: `DELETE FROM mentoring_session_history WHERE session_id IN (SELECT id FROM mentoring_sessions WHERE student_id = ?)`, args: [studentId] });
      await db.execute({ sql: `DELETE FROM mentoring_sessions WHERE student_id = ?`, args: [studentId] });
      await db.execute({ sql: `DELETE FROM mentor_requests WHERE student_id = ?`, args: [studentId] });
      await db.execute({ sql: `DELETE FROM mentors WHERE id = ?`, args: [mentorId] });
      await db.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [studentId] });
      await db.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [mentorUserId] });
    } catch (e) {
      // ignore
    }
  });

  let createdRequestId: string;
  let scheduledSessionId: string;

  it('allows a student to submit a mentoring request', async () => {
    const req = await requestsRepository.create({
      student_id: studentId,
      mentor_id: mentorId,
      student_name: 'Workflow Student',
      student_email: `student_${timestamp}@anxclub.com`,
      topic: 'Career Roadmap & Distributed Systems',
      message: 'Looking for advice on edge computing architectures.',
      proposed_duration: 45,
    });

    expect(req).toBeDefined();
    expect(req.id).toBeDefined();
    expect(req.status).toBe('pending');
    expect(req.topic).toBe('Career Roadmap & Distributed Systems');
    createdRequestId = req.id;
  });

  it('prevents duplicate pending requests for the same student-mentor pair', async () => {
    await expect(
      requestsRepository.create({
        student_id: studentId,
        mentor_id: mentorId,
        student_name: 'Workflow Student',
        student_email: `student_${timestamp}@anxclub.com`,
        topic: 'Another Topic',
        message: 'Duplicate request attempt.',
      })
    ).rejects.toThrow(/You already have an active request/);
  });

  it('allows the mentor to review and accept the request (without auto-scheduling meeting)', async () => {
    const accepted = await requestsRepository.accept(createdRequestId, mentorId);
    expect(accepted.status).toBe('accepted');

    const fetched = await requestsRepository.getById(createdRequestId);
    expect(fetched?.status).toBe('accepted');
  });

  it('allows the mentor to schedule a session, creating confirmed session and history', async () => {
    const scheduledDate = '2026-11-20';
    const scheduledTime = '14:00';
    const fakeMeetLink = 'https://meet.google.com/xyz-abcd-efg';

    const session = await sessionsRepository.scheduleSession({
      request_id: createdRequestId,
      mentor_id: mentorId,
      student_id: studentId,
      scheduled_at: `${scheduledDate}T${scheduledTime}:00Z`,
      duration_minutes: 45,
      meeting_link: fakeMeetLink,
      google_calendar_event_id: 'test_cal_event_123',
    });

    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.status).toBe('confirmed');
    expect(session.meeting_link).toBe(fakeMeetLink);
    scheduledSessionId = session.id;

    // Verify session history was recorded
    const history = await sessionsRepository.getSessionHistory(session.id);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].action).toBe('scheduled');
  });

  it('prevents double-booking for the mentor at the same time', async () => {
    // Attempting to schedule another session overlapping at the same time
    await expect(
      sessionsRepository.scheduleSession({
        request_id: `temp_req_${Date.now()}`,
        mentor_id: mentorId,
        student_id: studentId,
        scheduled_at: `2026-11-20T14:15:00Z`, // Overlaps with 14:00 - 14:45
        duration_minutes: 30,
      })
    ).rejects.toThrow(/overlaps with an existing confirmed session/);
  });

  it('allows session rescheduling with history update', async () => {
    const newScheduledAt = '2026-11-21T16:00:00Z';
    const updated = await sessionsRepository.rescheduleSession(
      scheduledSessionId,
      newScheduledAt,
      mentorUserId,
      'Rescheduled due to mentor conflict'
    );

    expect(updated.scheduled_at).toBe(newScheduledAt);
    expect(updated.status).toBe('confirmed');

    const history = await sessionsRepository.getSessionHistory(scheduledSessionId);
    const rescheduleRecord = history.find(h => h.action === 'rescheduled');
    expect(rescheduleRecord).toBeDefined();
    expect(rescheduleRecord?.reason).toBe('Rescheduled due to mentor conflict');
  });

  it('allows duration update', async () => {
    const updated = await sessionsRepository.updateDuration(scheduledSessionId, 60, mentorUserId);
    expect(updated.duration_minutes).toBe(60);
  });

  it('completes session and awards +75 XP to student', async () => {
    const completed = await sessionsRepository.completeSession(
      scheduledSessionId,
      mentorUserId,
      'Great discussion on distributed databases.'
    );

    expect(completed.status).toBe('completed');
    expect(completed.notes).toBe('Great discussion on distributed databases.');

    // Check student XP was incremented by 75
    const studentUser = await usersRepository.getById(studentId);
    expect(studentUser?.xp_total).toBe(75);

    // Check XP ledger entry
    const ledgerRes = await db.execute({
      sql: `SELECT * FROM xp_ledger WHERE user_id = ? AND action_type = 'mentoring_session_completed'`,
      args: [studentId],
    });
    expect(ledgerRes.rows.length).toBe(1);
    expect(Number(ledgerRes.rows[0].xp_value)).toBe(75);
  });

  it('is idempotent when completing session and does not award duplicate XP', async () => {
    const completedAgain = await sessionsRepository.completeSession(
      scheduledSessionId,
      mentorUserId,
      'Duplicate complete attempt.'
    );

    expect(completedAgain.status).toBe('completed');

    // XP must strictly remain 75, NOT double to 150
    const studentUser = await usersRepository.getById(studentId);
    expect(studentUser?.xp_total).toBe(75);

    // Ledger must still have only 1 record
    const ledgerRes = await db.execute({
      sql: `SELECT * FROM xp_ledger WHERE user_id = ? AND action_type = 'mentoring_session_completed'`,
      args: [studentId],
    });
    expect(ledgerRes.rows.length).toBe(1);
  });

  it('supports request decline with reason', async () => {
    // Student creates a new request
    const declineReq = await requestsRepository.create({
      student_id: studentId,
      mentor_id: mentorId,
      student_name: 'Workflow Student',
      student_email: `student_${timestamp}@anxclub.com`,
      topic: 'Topic to be declined',
      message: 'Declined request test',
    });

    const declined = await requestsRepository.decline(
      declineReq.id,
      mentorId,
      'Currently unavailable for this topic.'
    );

    expect(declined.status).toBe('declined');
    expect(declined.decline_reason).toBe('Currently unavailable for this topic.');
  });
});
