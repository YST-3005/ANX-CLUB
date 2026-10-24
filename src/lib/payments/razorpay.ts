import Razorpay from "razorpay";
import crypto from "crypto";

export const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export interface CreateOrderOptions {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export async function createRazorpayOrder({
  amount,
  currency = "INR",
  receipt,
  notes,
}: CreateOrderOptions) {
  const options = {
    amount: Math.round(amount * 100), // Razorpay requires amount in paise
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
    notes,
  };
  return razorpay.orders.create(options);
}

export interface VerifySignatureOptions {
  orderId: string;
  paymentId: string;
  signature: string;
}

export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}: VerifySignatureOptions) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error('RAZORPAY_KEY_SECRET is not configured');
  }
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
    
  const expectedBuf = Buffer.from(expectedSignature, 'hex');
  const actualBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
