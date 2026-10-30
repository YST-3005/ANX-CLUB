import { NextResponse, NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticate } from '@/lib/auth';
import { sendEmail } from '@/lib/resend';
import { mentorBookingRequestEmail } from '@/lib/email-templates';
import { awardXP } from '@/lib/gamification';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Fetch verified student profile from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    const studentEmail = (userData.email || body.userEmail || body.email || '').toLowerCase().trim();
    const studentName = userData.fullName || userData.displayName || body.userName || 'Student Member';

    // Fetch mentor details to ensure accurate mentorId, mentorName, and mentorEmail
    let mentorDoc = await adminDb.collection('mentors').doc(params.id).get();
    let mentorData = mentorDoc.exists ? mentorDoc.data() : null;
    let mentorId = params.id;
    let mentorEmail = '';
    let mentorName = body.mentorName || 'Expert Mentor';

    if (mentorData) {
      mentorName = mentorData.name || mentorName;
      mentorEmail = mentorData.ownerEmail || mentorData.email || '';
      mentorId = mentorData.uid || mentorData.id || params.id;
    } else {
      // Check if params.id was a user ID
      const mentorUserDoc = await adminDb.collection('users').doc(params.id).get();
      if (mentorUserDoc.exists) {
        const u = mentorUserDoc.data() || {};
        mentorName = u.fullName || mentorName;
        mentorEmail = u.email || '';
      }
    }

    const topic = body.topic || body.reason || body.message || '1-on-1 Mentorship Session';
    const message = body.message || body.reason || '';
    const preferredDate = body.preferredDate || body.date || '';
    const preferredTime = body.preferredTime || body.time || '';
    const preferredTimes = body.preferredTimes || (preferredDate ? [`${preferredDate} ${preferredTime}`.trim()] : []);
    const isPaid = Boolean(body.isPaid || body.paymentId || (body.amount && body.amount > 0));
    const amount = Number(body.amount || 0);

    const today = new Date().toISOString().split('T')[0];
    if (preferredDate && preferredDate < today) {
      return NextResponse.json({
        success: false,
        message: 'Cannot request mentorship sessions for past dates. Please select an upcoming date.'
      }, { status: 400 });
    }

    // Unified request data model: NO fake Meet links! Link remains null until scheduled via Google Calendar API
    const nowISO = new Date().toISOString();
    const requestData = {
      studentId: userId,
      studentName,
      studentEmail,
      mentorId,
      mentorName,
      mentorEmail,
      topic,
      message,
      preferredDate,
      preferredTime,
      preferredTimes,
      isPaid,
      amount,
      status: 'pending',
      meetLink: null,
      meetingLink: null,
      createdAt: nowISO,
      updatedAt: nowISO,
      history: [
        {
          action: 'created',
          performedBy: userId,
          performedByRole: 'student',
          timestamp: nowISO,
          notes: 'Mentorship request submitted by student'
        }
      ],
      // Compatibility aliases
      memberId: userId,
      userId,
      memberName: studentName,
      memberEmail: studentEmail,
    };

    const docRef = await adminDb.collection('mentorRequests').add(requestData);
    const docId = docRef.id;

    // Award +40 XP for submitting a booking request
    let xpAwarded = 40;
    try {
      const xpRes = await awardXP(userId, 'mentor', 40, docId, `Booked 1-on-1 Mentorship request with ${mentorName}`);
      if (xpRes?.xpAwarded) xpAwarded = xpRes.xpAwarded;
    } catch (xpErr) {
      console.warn('XP award notice for mentor booking:', xpErr);
    }

    // Send confirmation email to student (without fake meet link)
    try {
      if (studentEmail) {
        await sendEmail(
          studentEmail,
          `Mentor Session Requested: ${mentorName}`,
          mentorBookingRequestEmail(mentorName, preferredDate || 'Flexible', preferredTime || 'Flexible', topic)
        );
      }
      if (mentorEmail) {
        await sendEmail(
          mentorEmail,
          `📥 New Mentoring Request from ${studentName}`,
          `<p>Hi ${mentorName},</p><p>You have received a new mentorship request from <strong>${studentName}</strong> on the topic: <em>"${topic}"</em>.</p><p><strong>Message:</strong> ${message || 'No additional notes provided'}</p><p>Review and accept/decline this request in your <a href="https://anx.club/mentor-dashboard">Mentor Dashboard</a>.</p>`
        );
      }
    } catch (emailErr) {
      console.warn('Notification email sending failed:', emailErr);
    }

    // Create real-time in-app notification for the mentor
    try {
      let mentorUserId = mentorId;
      if (!mentorUserId && mentorEmail) {
        const uSnap = await adminDb.collection('users').where('email', '==', mentorEmail.toLowerCase()).get();
        if (!uSnap.empty) mentorUserId = uSnap.docs[0].id;
      }

      if (mentorUserId) {
        await adminDb.collection('notifications').add({
          recipientId: mentorUserId,
          title: 'New Mentoring Request',
          body: `${studentName} requested mentorship on "${topic}".`,
          actionUrl: '/mentor-dashboard',
          channels: ['in_app'],
          category: 'mentoring',
          isRead: false,
          createdAt: nowISO
        });
      }
    } catch (notifErr) {
      console.warn('Failed to create mentor notification:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Mentoring request submitted successfully! Awaiting mentor review.',
      data: {
        id: docId,
        xpAwarded,
        ...requestData
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error submitting mentor request:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Error submitting request' } },
      { status: 500 }
    );
  }
}
