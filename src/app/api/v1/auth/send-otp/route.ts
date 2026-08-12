import { NextResponse } from 'next/server';
import { sendOTP } from '@/lib/fast2sms';
import { adminDb } from '@/lib/firebase/admin';

// In-memory sliding window store (use Redis in multi-region deployments)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, limit = 3, windowMs = 60 * 1000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;

  record.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    let formattedPhone = phoneNumber.replace(/^\+91/, '');
    const rateLimitKey = `${ip}:${formattedPhone}`;

    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please wait 1 minute before retrying.' },
        { status: 429 }
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await adminDb.collection('otps').doc(formattedPhone).set({
      otp,
      expiresAt,
      createdAt: new Date(),
    });

    await sendOTP(formattedPhone, otp);

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 });
  }
}

