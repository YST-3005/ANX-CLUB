import crypto from 'crypto';
import { db } from '@/lib/turso/client';

export interface PushWebhookPayload {
  recipientId: string;
  recipientTopic?: string;
  entity: string;
  entity_id: string;
  summary: string;
  version: number;
  updated_at: number;
  data: Record<string, string>;
}

/**
 * Dispatches a non-blocking HMAC-signed push webhook to the Cloudflare FCM Worker.
 * Also durably records the notification in Turso for reliable in-app fetching.
 */
export function queuePushWebhook(payload: PushWebhookPayload): void {
  const workerUrl = process.env.CF_WORKER_URL;
  const secret = process.env.CF_WEBHOOK_SECRET || process.env.WEBHOOK_HMAC_SECRET;

  // 1. Durably record in Turso notifications table asynchronously
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  db.execute({
    sql: `
      INSERT INTO mentoring_notifications (
        id, recipient_id, type, title, body, action_url, is_read, delivery_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 'sent', ?)
    `,
    args: [
      notifId,
      payload.recipientId,
      payload.entity,
      payload.summary,
      payload.data.message || payload.summary,
      payload.data.actionUrl || '/dashboard',
      now,
    ],
  }).catch((err) => {
    console.warn('[WebhookDispatcher] Failed to write notification to Turso:', err?.message || err);
  });

  // 2. Dispatch to Cloudflare Worker edge webhook if configured
  if (!workerUrl || !secret) {
    return;
  }

  const timestamp = Date.now().toString();
  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  // Fire-and-forget: execute asynchronously without blocking API response
  fetch(workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Signature': signature,
    },
    body: rawBody,
  }).catch((err) => {
    console.error('[WebhookDispatcher] Failed to send push webhook to Cloudflare Worker:', err?.message || err);
  });
}
