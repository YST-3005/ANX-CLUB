import { adminDb } from '@/lib/firebase/admin';

export interface EmailDispatchResult {
  id: string;
  to: string;
  subject: string;
  status: 'delivered' | 'virtual' | 'failed';
  virtual?: boolean;
  error?: string | null;
}

/**
 * Robust Email Dispatch Service supporting Resend with automatic virtual fallback and delivery logging.
 * Wrapped in non-blocking try-catch so email dispatch failures NEVER break database transactions.
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments?: any[]
): Promise<EmailDispatchResult> => {
  const emailId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const apiKey = process.env.RESEND_API_KEY;
  const isRealApiKey = apiKey && !apiKey.includes('your_resend') && apiKey.startsWith('re_');
  const from = process.env.EMAIL_FROM || 'notifications@anx.club';

  let status: 'delivered' | 'virtual' | 'failed' = 'virtual';
  let errorMsg: string | null = null;

  if (isRealApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
          ...(attachments && attachments.length > 0 ? { attachments } : {}),
        }),
      });

      if (res.ok) {
        status = 'delivered';
        console.log(`📨 [RESEND] Dispatched email to ${to} | Subject: "${subject}"`);
      } else {
        const errorText = await res.text();
        status = 'failed';
        errorMsg = errorText;
        console.warn(`⚠️ [RESEND] Dispatch failed (${res.status}): ${errorText}`);
      }
    } catch (err: any) {
      status = 'failed';
      errorMsg = err?.message || 'Network error calling Resend';
      console.warn(`⚠️ [RESEND] Network exception: ${errorMsg}`);
    }
  } else {
    console.log(`📨 [EMAIL DISPATCH] -> To: ${to} | Subject: "${subject}" (Virtual Delivery - Resend API key not configured)`);
  }

  // Record delivery status in Firestore emailLogs for audit and retryability
  if (adminDb) {
    try {
      await adminDb.collection('emailLogs').doc(emailId).set({
        id: emailId,
        to,
        from,
        subject,
        status,
        error: errorMsg,
        virtual: status === 'virtual',
        createdAt: new Date().toISOString(),
      });
    } catch (logErr) {
      // Non-fatal logging failure
    }
  }

  return {
    id: emailId,
    to,
    subject,
    status,
    virtual: status === 'virtual',
    error: errorMsg,
  };
};
