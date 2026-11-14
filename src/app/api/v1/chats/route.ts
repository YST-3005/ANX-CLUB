import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if ('response' in authResult) {
      return authResult.response;
    }
    const { user } = authResult;

    const body = await request.json();
    const { currentEmail, currentUserName, targetEmail, targetUserName } = body;

    if (!currentEmail || !targetEmail || !currentUserName || !targetUserName) {
      return NextResponse.json({ error: 'Missing required fields or mentor has no owner email' }, { status: 400 });
    }

    // Security: Authenticated user must be one of the chat participants (or an Admin)
    const normalizedUserEmail = (user.email || '').toLowerCase().trim();
    const normalizedCurrent = currentEmail.toLowerCase().trim();
    const normalizedTarget = targetEmail.toLowerCase().trim();
    const isAdmin = user.role.toLowerCase() === 'admin';

    if (!isAdmin && normalizedUserEmail !== normalizedCurrent && normalizedUserEmail !== normalizedTarget) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot initialize or view chats for other users.' },
        { status: 403 }
      );
    }

    // Sort emails to ensure consistent participant array query
    const participants = [normalizedCurrent, normalizedTarget].sort();

    // Check if chat exists
    const snapshot = await adminDb.collection('chats')
      .where('participants', '==', participants)
      .get();

    if (!snapshot.empty) {
      // Chat exists, return existing ID
      const existingChatId = snapshot.docs[0].id;
      return NextResponse.json({ chatId: existingChatId });
    }

    // Create new chat
    const chatData = {
      participants,
      participantNames: {
        [currentEmail]: currentUserName,
        [targetEmail]: targetUserName
      },
      updatedAt: new Date().toISOString(),
      lastMessage: ""
    };

    const docRef = await adminDb.collection('chats').add(chatData);

    return NextResponse.json({ chatId: docRef.id });

  } catch (error: any) {
    console.error('Error in chats API:', error);
    return NextResponse.json({ error: 'Failed to initialize chat' }, { status: 500 });
  }
}

