import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { db } from '@/lib/turso/client';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await db.execute({
      sql: `SELECT id, recipient_id, type, title, body, action_url, is_read, delivery_status, created_at
            FROM mentoring_notifications
            WHERE recipient_id = ?
            ORDER BY created_at DESC
            LIMIT 50`,
      args: [auth.uid],
    });

    const notifications = result.rows.map((row: any) => ({
      id: String(row.id),
      recipientId: String(row.recipient_id),
      type: String(row.type),
      title: String(row.title),
      body: String(row.body),
      actionUrl: row.action_url ? String(row.action_url) : undefined,
      isRead: Number(row.is_read) === 1,
      deliveryStatus: String(row.delivery_status),
      createdAt: Number(row.created_at),
    }));

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter(n => !n.isRead).length,
    });
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, all } = body;

    if (all) {
      await db.execute({
        sql: `UPDATE mentoring_notifications SET is_read = 1 WHERE recipient_id = ?`,
        args: [auth.uid],
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (id) {
      await db.execute({
        sql: `UPDATE mentoring_notifications SET is_read = 1 WHERE id = ? AND recipient_id = ?`,
        args: [id, auth.uid],
      });
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ error: 'Missing notification id or all flag' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed to update notifications:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
