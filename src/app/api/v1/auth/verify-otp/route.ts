import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';
import crypto from 'crypto';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const devRateLimitStore = new Map<string, { count: number; resetTime: number }>();

async function checkRateLimit(key: string, limit = 5, windowSecs = 300): Promise<boolean> {
  if (redis) {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSecs);
    }
    return current <= limit;
  } else {
    const now = Date.now();
    const record = devRateLimitStore.get(key);
    if (!record || now > record.resetTime) {
      devRateLimitStore.set(key, { count: 1, resetTime: now + windowSecs * 1000 });
      return true;
    }
    if (record.count >= limit) return false;
    record.count += 1;
    return true;
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const { phoneNumber, otp } = await request.json();

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    // Format phone number
    let formattedPhone = phoneNumber;
    if (formattedPhone.startsWith('+91')) {
      formattedPhone = formattedPhone.substring(3);
    }

    // Rate limit verification attempts (5 attempts per 5 minutes per IP+Phone)
    const rateLimitKey = `rate-limit:verify-otp:${ip}:${formattedPhone}`;
    const isAllowed = await checkRateLimit(rateLimitKey);
    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many verification attempts. Please try again later." } },
        { status: 429 }
      );
    }

    const otpDocRef = adminDb.collection('otps').doc(formattedPhone);

    const result = await adminDb.runTransaction(async (transaction) => {
      const otpDoc = await transaction.get(otpDocRef);

      if (!otpDoc.exists) {
        throw new Error("INVALID_OTP");
      }

      const data = otpDoc.data()!;
      
      const now = new Date();
      if (data.expiresAt.toDate() < now) {
        transaction.delete(otpDocRef);
        throw new Error("EXPIRED_OTP");
      }

      if (data.attempts >= data.maxAttempts) {
        transaction.delete(otpDocRef);
        throw new Error("MAX_ATTEMPTS_REACHED");
      }

      const hashedInputOtp = crypto.createHash('sha256').update(otp).digest('hex');
      
      if (data.otpHash !== hashedInputOtp) {
        transaction.update(otpDocRef, {
          attempts: admin.firestore.FieldValue.increment(1)
        });
        throw new Error("INCORRECT_OTP");
      }

      // OTP is valid
      transaction.delete(otpDocRef);
      return true;
    });

    return NextResponse.json({ success: true, message: 'OTP verified successfully' });
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    
    let errorCode = "INTERNAL_ERROR";
    let message = "Failed to verify OTP";
    let status = 500;
    
    if (error.message === "INVALID_OTP") {
      errorCode = "INVALID_OTP";
      message = "Invalid or missing OTP";
      status = 400;
    } else if (error.message === "EXPIRED_OTP") {
      errorCode = "EXPIRED_OTP";
      message = "OTP has expired";
      status = 400;
    } else if (error.message === "MAX_ATTEMPTS_REACHED") {
      errorCode = "MAX_ATTEMPTS_REACHED";
      message = "Too many failed attempts. Please request a new OTP.";
      status = 429;
    } else if (error.message === "INCORRECT_OTP") {
      errorCode = "INCORRECT_OTP";
      message = "Incorrect OTP";
      status = 400;
    }

    return NextResponse.json(
      { success: false, error: { code: errorCode, message } },
      { status }
    );
  }
}

