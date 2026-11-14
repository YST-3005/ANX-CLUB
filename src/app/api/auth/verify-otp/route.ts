import { NextResponse } from 'next/server';
import {adminDb} from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
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

    const otpDocRef = adminDb.collection('otps').doc(formattedPhone);
    const otpDoc = await otpDocRef.get();

    if (!otpDoc.exists) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    const data = otpDoc.data();
    const now = new Date();
    const expiresAt = data?.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data?.expiresAt || 0);

    if (expiresAt < now) {
      await otpDocRef.delete();
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
    }

    if (data?.otp !== otp) {
      const attempts = (data?.attempts || 0) + 1;
      if (attempts >= 5) {
        await otpDocRef.delete();
        return NextResponse.json(
          { error: 'Too many failed attempts. This OTP has been invalidated for security. Please request a new code.' },
          { status: 429 }
        );
      }
      await otpDocRef.update({ attempts });
      return NextResponse.json(
        { error: `Incorrect OTP. ${5 - attempts} attempt(s) remaining.` },
        { status: 400 }
      );
    }

    // OTP is valid - delete it so it cannot be replayed
    await otpDocRef.delete();

    return NextResponse.json({ success: true, message: 'OTP verified successfully' });
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}
