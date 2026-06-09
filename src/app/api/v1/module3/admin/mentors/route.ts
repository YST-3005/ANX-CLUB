import { NextResponse } from 'next/server';
import { db } from '@/modules/module3/lib/firebase/client';
import { collection, addDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, role, company, bio, linkedin, topics, imageUrl, ownerEmail } = body;

    if (!name || !role || !company || !topics || topics.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const mentorData = {
      name,
      role,
      company,
      bio: bio || '',
      linkedin: linkedin || '',
      topics,
      imageUrl: imageUrl || '',
      ownerEmail: ownerEmail || '',
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'mentors'), mentorData);

    return NextResponse.json({ id: docRef.id, ...mentorData }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating mentor:', error);
    return NextResponse.json({ error: error.message || 'Error creating mentor' }, { status: 500 });
  }
}
