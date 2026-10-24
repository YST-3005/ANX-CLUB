import { adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp';

export interface NotificationPayload {
  recipientId: string;
  title: string;
  body: string;
  channels: NotificationChannel[];
  actionUrl?: string;
  category?: string;
  emailContact?: string; // required if channels includes email
  whatsappContact?: string; // required if channels includes whatsapp
}

/**
 * Sends notifications across specified channels safely without throwing 
 * errors that would disrupt core database transactions.
 */
export async function sendOmnichannelNotification(payload: NotificationPayload) {
  const { recipientId, title, body, channels, actionUrl, category, emailContact, whatsappContact } = payload;
  
  // 1. In-App Notification (Firestore)
  if (channels.includes('in_app')) {
    try {
      const notifRef = adminDb.collection('notifications').doc();
      await notifRef.set({
        id: notifRef.id,
        recipientId,
        channels: ['in_app'], // We only log the in_app part in this collection for the UI
        category: category || 'system',
        title,
        body,
        actionUrl: actionUrl || null,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error(`Failed to create in-app notification for user ${recipientId}`, error);
    }
  }

  // 2. Email Notification (Resend)
  if (channels.includes('email') && emailContact) {
    try {
      if (process.env.RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'ANX <noreply@anxplatform.com>',
            to: [emailContact],
            subject: title,
            html: `<p>${body}</p>${actionUrl ? `<a href="${actionUrl}">View Details</a>` : ''}`
          })
        });
      } else {
        console.warn('RESEND_API_KEY missing. Skipping email notification.');
      }
    } catch (error) {
      console.error(`Failed to send email notification to ${emailContact}`, error);
    }
  }

  // 3. WhatsApp Notification (Wati.io)
  if (channels.includes('whatsapp') && whatsappContact) {
    try {
      if (process.env.WATI_API_ENDPOINT && process.env.WATI_API_TOKEN) {
        // Wati.io API payload (generic template sending)
        await fetch(`${process.env.WATI_API_ENDPOINT}/api/v1/sendTemplateMessage`, {
          method: 'POST',
          headers: {
            'Authorization': process.env.WATI_API_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            whatsappNumber: whatsappContact,
            template_name: 'anx_notification',
            broadcast_name: category || 'notification',
            parameters: [
              { name: 'title', value: title },
              { name: 'body', value: body }
            ]
          })
        });
      } else {
         console.warn('WATI API credentials missing. Skipping WhatsApp notification.');
      }
    } catch (error) {
      console.error(`Failed to send WhatsApp notification to ${whatsappContact}`, error);
    }
  }
}

export async function sendEventReminder(userId: string, eventTitle: string, emailContact?: string, whatsappContact?: string) {
  return sendOmnichannelNotification({
    recipientId: userId,
    title: 'Upcoming Event Reminder',
    body: `Reminder: You have an upcoming event "${eventTitle}" starting in 24 hours.`,
    channels: ['in_app', 'email', 'whatsapp'],
    category: 'event',
    emailContact,
    whatsappContact
  });
}

export async function sendXPUnlockAlert(userId: string, xpAmount: number, emailContact?: string, whatsappContact?: string) {
  return sendOmnichannelNotification({
    recipientId: userId,
    title: 'XP Unlocked!',
    body: `Congratulations! You just earned +${xpAmount} XP. Keep up the great work!`,
    channels: ['in_app', 'whatsapp'],
    category: 'gamification',
    emailContact,
    whatsappContact
  });
}
