import { NextResponse } from 'next/server';
import { sendOTP } from '@/lib/fast2sms';
import { adminDb } from '@/lib/firebase/admin';
import crypto from 'crypto';
import { Redis } from '@upstash/redis';

// Initialize Redis client. Fails in production if URL/Token are missing.
let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
} else if (process.env.NODE_ENV === 'production') {
  console.warn("WARNING: Redis/Upstash is missing but required in production for rate limiting.");
}

async function checkRateLimit(key: string, limit = 3, windowSecs = 60): Promise<boolean> {
  if (redis) {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSecs);
    }
    return current <= limit;
  } else {
    console.error("Redis is not configured. Rate limiting is mandatory for OTP.");
    throw new Error("Rate Limiting Service Unavailable");
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Phone number is required" } }, { status: 400 });
    }

    const formattedPhone = phoneNumber.replace(/^\+91/, '');
    const rateLimitKey = `rate-limit:otp:${ip}:${formattedPhone}`;

    const isAllowed = await checkRateLimit(rateLimitKey);
    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many OTP requests. Please wait 1 minute before retrying." } },
        { status: 429 }
      );
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await adminDb.collection('otps').doc(formattedPhone).set({
      otpHash: hashedOtp,
      expiresAt,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: 5
    });

    await sendOTP(formattedPhone, otp);

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to send OTP" } }, 
      { status: 500 }
    );
  }
}
