import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * Dev-Only Mentoring Seed Script
 * Refuses to run if NODE_ENV === 'production'.
 * Creates test student, two mentors, admin account, sample requests, and sample scheduled session.
 */
async function seedMentoring() {
  if (process.env.NODE_ENV === 'production') {
    console.error('⛔ FATAL: scripts/seed-mentoring.ts refuses to run in production mode!');
    process.exit(1);
  }

  console.log('🌱 Starting Dev-Only Mentoring Seed Script...');

  const password = 'Password@123';
  const nowISO = new Date().toISOString();
  const tomorrowISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Helper to ensure Firebase Auth user exists
  async function ensureAuthUser(email: string, displayName: string, customClaims: Record<string, any> = {}) {
    let user;
    try {
      user = await adminAuth.getUserByEmail(email);
      user = await adminAuth.updateUser(user.uid, { password, displayName });
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        user = await adminAuth.createUser({ email, password, displayName });
      } else {
        throw err;
      }
    }
    if (Object.keys(customClaims).length > 0) {
      await adminAuth.setCustomUserClaims(user.uid, customClaims);
    }
    return user;
  }

  // 1. Test Student
  console.log('👤 Seeding Test Student...');
  const studentAuth = await ensureAuthUser('student@anx.club', 'Alex Student');
  await adminDb.collection('users').doc(studentAuth.uid).set({
    uid: studentAuth.uid,
    email: 'student@anx.club',
    fullName: 'Alex Student',
    role: 'Member',
    membershipType: 'Pro',
    xpTotal: 140,
    leadershipStage: 'Associate',
    createdAt: nowISO,
    updatedAt: nowISO,
  }, { merge: true });

  // 2. Test Mentor 1 (Distributed Systems)
  console.log('👨‍🏫 Seeding Mentor 1 (Dr. Sarah Chen)...');
  const mentor1Auth = await ensureAuthUser('mentor1@anx.club', 'Dr. Sarah Chen', { mentor: true });
  const mentor1Data = {
    uid: mentor1Auth.uid,
    name: 'Dr. Sarah Chen',
    fullName: 'Dr. Sarah Chen',
    email: 'mentor1@anx.club',
    ownerEmail: 'mentor1@anx.club',
    role: 'Mentor',
    company: 'Google Cloud',
    title: 'Principal Systems Architect',
    bio: '12+ years designing planet-scale distributed consensus systems and storage engines. Passionate about helping campus engineers master concurrency, Raft, and distributed debugging.',
    skills: ['Go', 'Distributed Systems', 'Kubernetes', 'Storage Engines', 'Consensus Algorithms'],
    topics: ['Distributed Systems Design', 'Mock Technical Architecture Interview', 'Go Concurrency Deep-Dive'],
    hourlyRate: 0,
    timezone: 'UTC',
    availableDays: ['Mon', 'Wed', 'Fri'],
    availableHours: { start: '14:00', end: '18:00' },
    googleCalendarConnected: false,
    googleCalendarNeedsReconnect: false,
    sessionsCompleted: 14,
    rating: 4.95,
    totalReviews: 22,
    createdAt: nowISO,
    updatedAt: nowISO,
  };
  await adminDb.collection('users').doc(mentor1Auth.uid).set({
    uid: mentor1Auth.uid,
    email: 'mentor1@anx.club',
    fullName: 'Dr. Sarah Chen',
    role: 'Mentor',
    membershipType: 'Lifetime',
    createdAt: nowISO,
    updatedAt: nowISO,
  }, { merge: true });
  await adminDb.collection('mentors').doc(mentor1Auth.uid).set(mentor1Data, { merge: true });

  // 3. Test Mentor 2 (Frontend Architecture)
  console.log('👨‍🏫 Seeding Mentor 2 (Alex Rodriguez)...');
  const mentor2Auth = await ensureAuthUser('mentor2@anx.club', 'Alex Rodriguez', { mentor: true });
  const mentor2Data = {
    uid: mentor2Auth.uid,
    name: 'Alex Rodriguez',
    fullName: 'Alex Rodriguez',
    email: 'mentor2@anx.club',
    ownerEmail: 'mentor2@anx.club',
    role: 'Mentor',
    company: 'Stripe',
    title: 'Staff Frontend Architect',
    bio: 'Specializing in Next.js 14 App Router, Web Performance optimization, and large-scale design systems. Helping ambitious students prepare for Tier-1 frontend roles.',
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Web Performance'],
    topics: ['Frontend Architecture Teardown', 'Resume & Portfolio Review', 'React Internals'],
    hourlyRate: 0,
    timezone: 'America/New_York',
    availableDays: ['Tue', 'Thu', 'Sat'],
    availableHours: { start: '16:00', end: '20:00' },
    googleCalendarConnected: false,
    googleCalendarNeedsReconnect: false,
    sessionsCompleted: 8,
    rating: 4.9,
    totalReviews: 15,
    createdAt: nowISO,
    updatedAt: nowISO,
  };
  await adminDb.collection('users').doc(mentor2Auth.uid).set({
    uid: mentor2Auth.uid,
    email: 'mentor2@anx.club',
    fullName: 'Alex Rodriguez',
    role: 'Mentor',
    membershipType: 'Lifetime',
    createdAt: nowISO,
    updatedAt: nowISO,
  }, { merge: true });
  await adminDb.collection('mentors').doc(mentor2Auth.uid).set(mentor2Data, { merge: true });

  // 4. Test Admin
  console.log('👑 Seeding Admin Account...');
  const adminAuthUser = await ensureAuthUser('admin@anx.club', 'Platform Administrator', { admin: true });
  await adminDb.collection('users').doc(adminAuthUser.uid).set({
    uid: adminAuthUser.uid,
    email: 'admin@anx.club',
    fullName: 'Platform Administrator',
    role: 'Admin',
    membershipType: 'Lifetime',
    createdAt: nowISO,
    updatedAt: nowISO,
  }, { merge: true });

  // 5. Sample Pending Mentoring Request (Student -> Mentor 1)
  console.log('📝 Seeding Sample Pending Request...');
  const pendingReqRef = adminDb.collection('mentorRequests').doc('sample_request_pending');
  await pendingReqRef.set({
    id: 'sample_request_pending',
    studentId: studentAuth.uid,
    studentName: 'Alex Student',
    studentEmail: 'student@anx.club',
    mentorId: mentor1Auth.uid,
    mentorName: 'Dr. Sarah Chen',
    mentorEmail: 'mentor1@anx.club',
    topic: 'Distributed Storage Engines & Raft Consensus',
    message: 'Hi Dr. Chen, I am implementing a LSM-tree based KV store and struggling with the write-ahead log compaction protocol. Would love your guidance.',
    preferredDate: tomorrowISO.split('T')[0],
    preferredTime: '15:00',
    preferredTimes: [`${tomorrowISO.split('T')[0]} 15:00`],
    status: 'pending',
    meetLink: null,
    createdAt: nowISO,
    updatedAt: nowISO,
    history: [
      {
        action: 'created',
        performedBy: studentAuth.uid,
        performedByRole: 'student',
        timestamp: nowISO,
        notes: 'Request submitted by Alex Student',
      },
    ],
    // Aliases
    memberId: studentAuth.uid,
    userId: studentAuth.uid,
  });

  // 6. Sample Accepted Request Awaiting Scheduling (Student -> Mentor 2)
  console.log('📝 Seeding Sample Accepted Request...');
  const acceptedReqRef = adminDb.collection('mentorRequests').doc('sample_request_accepted');
  await acceptedReqRef.set({
    id: 'sample_request_accepted',
    studentId: studentAuth.uid,
    studentName: 'Alex Student',
    studentEmail: 'student@anx.club',
    mentorId: mentor2Auth.uid,
    mentorName: 'Alex Rodriguez',
    mentorEmail: 'mentor2@anx.club',
    topic: 'Next.js 14 App Router Architecture Critique',
    message: 'Reviewing streaming SSR and server actions boundaries in our startup prototype.',
    status: 'accepted_awaiting_scheduling',
    meetLink: null,
    createdAt: nowISO,
    updatedAt: nowISO,
    history: [
      {
        action: 'created',
        performedBy: studentAuth.uid,
        performedByRole: 'student',
        timestamp: nowISO,
        notes: 'Request submitted',
      },
      {
        action: 'accepted',
        performedBy: mentor2Auth.uid,
        performedByRole: 'mentor',
        timestamp: nowISO,
        notes: 'Accepted by Alex Rodriguez. Ready to schedule slot.',
      },
    ],
    memberId: studentAuth.uid,
    userId: studentAuth.uid,
  });

  // 7. Sample Scheduled Session (Student + Mentor 1)
  console.log('📅 Seeding Sample Scheduled Session...');
  const sessionRef = adminDb.collection('mentoringSessions').doc('sample_session_scheduled');
  const sessionStartUTC = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 2 days from now
  await sessionRef.set({
    id: 'sample_session_scheduled',
    requestId: 'sample_request_scheduled_origin',
    mentorId: mentor1Auth.uid,
    mentorName: 'Dr. Sarah Chen',
    mentorEmail: 'mentor1@anx.club',
    studentId: studentAuth.uid,
    studentName: 'Alex Student',
    studentEmail: 'student@anx.club',
    topic: 'Kubernetes Operator Design & Controller-Runtime',
    description: 'Deep dive into Custom Resource Definitions (CRDs) and reconciliation loops.',
    startAtUTC: sessionStartUTC,
    durationMin: 45,
    status: 'scheduled',
    googleEventId: null,
    meetLink: null, // STRICT: Remains null until mentor connects Google Calendar and syncs
    conferenceStatus: 'pending_scheduling',
    syncStatus: 'not_connected',
    syncError: 'Google integration pending mentor connection.',
    history: [
      {
        action: 'scheduled',
        performedBy: mentor1Auth.uid,
        performedByRole: 'mentor',
        timestamp: nowISO,
        notes: `Scheduled for ${sessionStartUTC} (45 min)`,
      },
    ],
    createdAt: nowISO,
    updatedAt: nowISO,
    memberId: studentAuth.uid,
    userId: studentAuth.uid,
  });

  console.log('\n✅ Seeding Complete! Test accounts created:');
  console.log('----------------------------------------------------');
  console.log('1. Student:   student@anx.club | Password@123');
  console.log('2. Mentor 1:  mentor1@anx.club | Password@123 (Dr. Sarah Chen)');
  console.log('3. Mentor 2:  mentor2@anx.club | Password@123 (Alex Rodriguez)');
  console.log('4. Admin:     admin@anx.club   | Password@123');
  console.log('----------------------------------------------------');
  console.log('Firestore documents created:');
  console.log('- mentorRequests: sample_request_pending (Pending review)');
  console.log('- mentorRequests: sample_request_accepted (Accepted, ready to schedule)');
  console.log('- mentoringSessions: sample_session_scheduled (Scheduled, link pending Google sync)');
  console.log('\n💡 To run with Firebase Emulator:');
  console.log('   export FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"');
  console.log('   export FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"');
}

seedMentoring().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
