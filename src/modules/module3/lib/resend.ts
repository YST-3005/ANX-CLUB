import { Resend } from 'resend';

// You must add RESEND_API_KEY to your .env.local file
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

export const sendEmail = async (to: string, subject: string, html: string, attachments?: any[]) => {
  try {
    const data = await resend.emails.send({
      from: 'Community Platform <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
      attachments,
    });
    console.log(`Email sent to ${to} with subject "${subject}"`, data);
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
