import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: any[];
  [key: string]: any;
}) {
  if (!resend) {
    console.warn("⚠️ Resend email API key is not configured. Email to", options.to, "was skipped. Subject:", options.subject);
    return { success: false, message: "Resend client not initialized." };
  }

  try {
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'ANX Platform <noreply@anxplatform.com>',
      ...options,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to send email via Resend:", error);
    return { success: false, error: error.message };
  }
}
