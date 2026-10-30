import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticate } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    const userRole = userData.role || 'Member';
    const userEmail = (userData.email || '').toLowerCase().trim();

    if (userRole !== 'Mentor' && userRole !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden: Mentor access required' }, { status: 403 });
    }

    // Lookup in mentors collection
    let mentorDoc: any = null;
    let mentorDocId = userId;

    if (userEmail) {
      const snap = await adminDb.collection('mentors').where('ownerEmail', '==', userEmail).limit(1).get();
      if (!snap.empty) {
        mentorDoc = { id: snap.docs[0].id, ...snap.docs[0].data() };
        mentorDocId = snap.docs[0].id;
      }
    }

    if (!mentorDoc) {
      const snapById = await adminDb.collection('mentors').doc(userId).get();
      if (snapById.exists) {
        mentorDoc = { id: snapById.id, ...snapById.data() };
      } else {
        mentorDoc = {
          id: userId,
          name: userData.fullName || 'Mentor',
          role: userData.title || 'Technical Mentor',
          company: userData.company || 'Industry Partner',
          bio: userData.bio || '',
          skills: userData.skills ? (Array.isArray(userData.skills) ? userData.skills : [userData.skills]) : ['React', 'Node.js', 'System Design'],
          expertise: ['Full-Stack', 'System Design'],
          hourlyRate: 0,
          ownerEmail: userEmail,
          rating: 5.0,
          totalReviews: 0,
          timezone: userData.timezone || 'UTC',
          availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          availableHours: { start: '09:00', end: '18:00' },
          googleCalendarConnected: false,
          linkedin: userData.linkedinUrl || userData.linkedin || '',
          topics: ['System Design', 'Code Review', 'Career Growth'],
        };
      }
    }

    return NextResponse.json({ success: true, data: mentorDoc });
  } catch (error: any) {
    console.error('[GET /api/v1/mentor/profile] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    const userRole = userData.role || 'Member';
    const userEmail = (userData.email || '').toLowerCase().trim();

    if (userRole !== 'Mentor' && userRole !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden: Mentor access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name, bio, company, role, skills, expertise,
      hourlyRate, linkedin, topics, timezone,
      availableDays, availableHours,
    } = body;

    const updatedFields: any = {
      updatedAt: new Date().toISOString(),
    };
    if (typeof name === 'string' && name.trim()) updatedFields.name = name.trim();
    if (typeof bio === 'string') updatedFields.bio = bio.trim();
    if (typeof company === 'string') updatedFields.company = company.trim();
    if (typeof role === 'string') updatedFields.role = role.trim();
    if (Array.isArray(skills)) updatedFields.skills = skills;
    if (Array.isArray(expertise)) updatedFields.expertise = expertise;
    if (typeof hourlyRate === 'number' && hourlyRate >= 0) updatedFields.hourlyRate = hourlyRate;
    if (typeof linkedin === 'string') updatedFields.linkedin = linkedin.trim();
    if (Array.isArray(topics)) updatedFields.topics = topics;
    if (typeof timezone === 'string') updatedFields.timezone = timezone.trim();
    if (Array.isArray(availableDays)) updatedFields.availableDays = availableDays;
    if (availableHours && typeof availableHours === 'object') updatedFields.availableHours = availableHours;

    // Check if mentor document exists by email or id
    let targetDocId = userId;
    if (userEmail) {
      const snap = await adminDb.collection('mentors').where('ownerEmail', '==', userEmail).limit(1).get();
      if (!snap.empty) {
        targetDocId = snap.docs[0].id;
      }
    }

    await adminDb.collection('mentors').doc(targetDocId).set({
      ownerEmail: userEmail,
      ...updatedFields,
    }, { merge: true });

    // Also sync to user document in users collection
    await adminDb.collection('users').doc(userId).set({
      fullName: updatedFields.name || userData.fullName,
      company: updatedFields.company || userData.company,
      title: updatedFields.role || userData.title,
      bio: updatedFields.bio || userData.bio,
      timezone: updatedFields.timezone || userData.timezone,
      skills: Array.isArray(updatedFields.skills) ? updatedFields.skills.join(', ') : userData.skills,
      linkedinUrl: updatedFields.linkedin || userData.linkedinUrl,
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Mentor profile updated successfully',
      data: updatedFields,
    });
  } catch (error: any) {
    console.error('[PATCH /api/v1/mentor/profile] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
