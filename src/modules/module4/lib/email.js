// lib/email.js
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Send event registration confirmation email.
 */
export async function sendRegistrationConfirmation({ to, name, eventTitle, eventDate, eventVenue }) {
  if (!resend) return { id: "email-skipped" };
return resend.emails.send({
    from: "Forge Alumnus <no-reply@forgealumnus.com>",
    to,
    subject: `You're registered for ${eventTitle} 🎉`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 32px;">
        <h2 style="color: #0f1f4a;">Registration Confirmed!</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>You have successfully registered for <strong>${eventTitle}</strong>.</p>
        <div style="background:#f1f5f9; border-radius:8px; padding:16px; margin:24px 0;">
          <p style="margin:0; color:#64748b;"><strong>Date:</strong> ${eventDate}</p>
          <p style="margin:8px 0 0; color:#64748b;"><strong>Venue:</strong> ${eventVenue}</p>
        </div>
        <p>We look forward to seeing you there. Keep building!</p>
        <hr style="border:none;border-top:1px solid #e2e8f0; margin:24px 0;" />
        <p style="font-size:12px; color:#94a3b8;">Forge Alumnus — Accelerating Futures</p>
      </div>
    `,
  });
}

/**
 * Send payment confirmation email.
 */
export async function sendPaymentConfirmation({ to, name, eventTitle, amount, paymentId }) {
  if (!resend) return { id: "email-skipped" };
  return resend.emails.send({
    from: "Forge Alumnus <no-reply@forgealumnus.com>",
    to,
    subject: `Payment Confirmed — ${eventTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 32px;">
        <h2 style="color: #0f1f4a;">Payment Successful ✅</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your payment for <strong>${eventTitle}</strong> has been received.</p>
        <div style="background:#f1f5f9; border-radius:8px; padding:16px; margin:24px 0;">
          <p style="margin:0; color:#64748b;"><strong>Amount:</strong> ₹${amount}</p>
          <p style="margin:8px 0 0; color:#64748b;"><strong>Payment ID:</strong> ${paymentId}</p>
        </div>
        <p>Your spot is confirmed. See you at the event!</p>
        <hr style="border:none;border-top:1px solid #e2e8f0; margin:24px 0;" />
        <p style="font-size:12px; color:#94a3b8;">Forge Alumnus — Accelerating Futures</p>
      </div>
    `,
  });
}
