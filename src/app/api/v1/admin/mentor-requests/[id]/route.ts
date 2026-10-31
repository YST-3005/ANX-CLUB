import { NextResponse, NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/resend';
import { mentorBookingApprovalEmail, generateICS } from '@/lib/email-templates';
import { getAuthenticatedUser } from '@/lib/mentoring-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    if (!user.isOfficialAdmin && user.role !== 'Admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin role required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!['Approved', 'Rejected', 'Completed', 'Cancelled'].includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_STATUS", message: "Invalid status value" } }, 
        { status: 400 }
      );
    }

    const docRef = adminDb.collection('mentorRequests').doc(params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Request not found" } }, { status: 404 });
    }

    const requestData = docSnap.data()!;
    const meetingLink = requestData.meetingLink || null;

    await docRef.update({ 
      status,
      ...(meetingLink ? { meetingLink } : {}),
      updatedAt: new Date().toISOString()
    });

    // Send email notification if approved or rejected
    if (status === 'Approved' || status === 'Rejected') {
      const emailStatus = status.toLowerCase() as 'approved' | 'rejected';
      
      const attachments = [];
      if (status === 'Approved' && meetingLink) {
        const icsContent = generateICS(requestData.mentorName, requestData.preferredDate, requestData.preferredTime, requestData.topic, meetingLink);
        attachments.push({
          filename: 'invite.ics',
          content: icsContent,
        });
      }

      // Add in-app notification
      await adminDb.collection('notifications').add({
        recipientId: requestData.memberId || requestData.studentId,
        title: `Mentor Session ${status}`,
        body: `Your mentoring session with ${requestData.mentorName} has been ${status.toLowerCase()}.`,
        isRead: false,
        actionUrl: '/dashboard',
        channels: ['in_app'],
        createdAt: new Date().toISOString()
      });

      if (requestData.memberEmail || requestData.studentEmail) {
        await sendEmail(
          requestData.memberEmail || requestData.studentEmail, 
          `Mentor Session ${status}`, 
          mentorBookingApprovalEmail(requestData.mentorName, requestData.preferredDate, emailStatus, meetingLink || undefined),
          attachments
        );
      }
    }

    if (status === 'Approved' || status === 'Completed') {
      try {
        const { awardMentorSessionXP } = await import('@/lib/gamification');
        await awardMentorSessionXP(requestData.memberId || requestData.studentId, params.id, requestData.mentorName);
      } catch (xpErr) {
        console.warn('Mentor session XP award skipped:', xpErr);
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error('Error updating mentor request:', error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error updating request" } }, 
      { status: 500 }
    );
  }
}
