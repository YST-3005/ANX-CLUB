import { NextResponse, NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { authenticate } from '@/lib/auth';
import { sendEmail } from '@/lib/resend';
import { mentorBookingRequestEmail } from '@/lib/email-templates';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await authenticate(request);
    
    const body = await request.json();
    const { userEmail, userName, mentorName, topic, date, time, message } = body;

    // Use token userId over body userId for security
    const actualUserId = userId || body.userId;

    if (!actualUserId || !userEmail || !topic || !date || !time) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Missing required fields" } }, 
        { status: 400 }
      );
    }

    const requestData = {
      mentorId: params.id,
      mentorName,
      memberId: actualUserId,
      memberName: userName,
      memberEmail: userEmail,
      topic,
      preferredDate: date,
      preferredTime: time,
      message,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    const docRef = await getAdminDb().collection('mentorRequests').add(requestData);

    // Send notification email to the member
    await sendEmail(userEmail, "Mentor Session Requested", mentorBookingRequestEmail(mentorName, date));

    // Create a real-time notification for the mentor if their account exists
    try {
      const mentorDoc = await getAdminDb().collection('mentors').doc(params.id).get();
      if (mentorDoc.exists && mentorDoc.data()!.ownerEmail) {
        const userSnap = await getAdminDb().collection('users')
          .where('email', '==', mentorDoc.data()!.ownerEmail)
          .get();
        
        if (!userSnap.empty) {
          const mentorUserId = userSnap.docs[0].id;
          await getAdminDb().collection('notifications').add({
            userId: mentorUserId,
            title: 'New Session Request',
            message: `${userName} requested a session on ${date}.`,
            link: '/mentor-dashboard',
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (notifErr) {
      console.error('Failed to create mentor notification:', notifErr);
    }

    return NextResponse.json({ success: true, data: { id: docRef.id, ...requestData } }, { status: 201 });
  } catch (error: any) {
    console.error('Error submitting mentor request:', error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error submitting request" } }, 
      { status: 500 }
    );
  }
}

