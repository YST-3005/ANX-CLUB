import { NextResponse } from 'next/server';
import { db } from '@/modules/module3/lib/firebase/client';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { sendEmail } from '@/modules/module3/lib/resend';
import { mentorBookingRequestEmail } from '@/modules/module3/lib/email-templates';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { userId, userEmail, userName, mentorName, topic, date, time, message } = body;

    if (!userId || !userEmail || !topic || !date || !time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const requestData = {
      mentorId: params.id,
      mentorName,
      memberId: userId,
      memberName: userName,
      memberEmail: userEmail,
      topic,
      preferredDate: date,
      preferredTime: time,
      message,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'mentorRequests'), requestData);

    // Send notification email to the member
    await sendEmail(userEmail, "Mentor Session Requested", mentorBookingRequestEmail(mentorName, date));

    // Create a real-time notification for the mentor if their account exists
    try {
      const mentorDoc = await getDoc(doc(db, 'mentors', params.id));
      if (mentorDoc.exists() && mentorDoc.data().ownerEmail) {
        const userQ = query(collection(db, 'users'), where('email', '==', mentorDoc.data().ownerEmail));
        const userSnap = await getDocs(userQ);
        
        if (!userSnap.empty) {
          const mentorUserId = userSnap.docs[0].id;
          await addDoc(collection(db, 'notifications'), {
            userId: mentorUserId,
            title: 'New Session Request',
            message: `${userName} requested a session on ${date}.`,
            link: '/module3/mentor-dashboard',
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (notifErr) {
      console.error('Failed to create mentor notification:', notifErr);
    }

    return NextResponse.json({ id: docRef.id, ...requestData }, { status: 201 });
  } catch (error: any) {
    console.error('Error submitting mentor request:', error);
    return NextResponse.json({ error: error.message || 'Error submitting request' }, { status: 500 });
  }
}
