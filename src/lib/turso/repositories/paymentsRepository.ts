import { db } from '@/lib/turso/client';

export interface PaymentRow {
  id: string;
  order_id: string;
  user_id: string;
  payment_type: string;
  amount: number;
  currency: string;
  status: string; // 'pending', 'paid', 'failed'
  razorpay_signature?: string | null;
  created_at: number;
  verified_at?: number | null;
}

export interface MembershipRow {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  start_date: number;
  end_date: number;
  razorpay_payment_id?: string | null;
  order_id?: string | null;
  amount: number;
  version: number;
  created_at: number;
  updated_at: number;
}

export const paymentsRepository = {
  async createPendingOrder(data: {
    orderId?: string;
    order_id?: string;
    userId?: string;
    user_id?: string;
    paymentType?: string;
    payment_type?: string;
    amount: number;
    currency?: string;
    metadata?: any;
  }): Promise<PaymentRow> {
    const orderId = (data.orderId || data.order_id)!;
    const userId = (data.userId || data.user_id)!;
    const paymentType = (data.paymentType || data.payment_type || 'membership')!;
    const now = Date.now();
    await db.execute({
      sql: `
        INSERT INTO payments (
          id, order_id, user_id, payment_type, amount, currency, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          amount = excluded.amount,
          created_at = excluded.created_at
      `,
      args: [
        orderId,
        orderId,
        userId,
        paymentType,
        data.amount,
        data.currency || 'INR',
        now,
      ],
    });

    const saved = await this.getByOrderId(orderId);
    return saved!;
  },

  async getByOrderId(orderId: string): Promise<PaymentRow | null> {
    const result = await db.execute({
      sql: `SELECT * FROM payments WHERE order_id = ? OR id = ? LIMIT 1`,
      args: [orderId, orderId],
    });
    return (result.rows[0] as unknown as PaymentRow) || null;
  },

  async markPaid(
    orderIdOrData: string | { orderId?: string; order_id?: string; paymentId?: string; payment_id?: string; signature?: string },
    paymentIdArg?: string,
    signatureArg?: string
  ): Promise<PaymentRow | null> {
    const orderId = typeof orderIdOrData === 'string' ? orderIdOrData : (orderIdOrData.orderId || orderIdOrData.order_id)!;
    const signature = typeof orderIdOrData === 'string' ? (signatureArg || null) : (orderIdOrData.signature || null);
    const now = Date.now();
    await db.execute({
      sql: `
        UPDATE payments
        SET status = 'paid',
            razorpay_signature = ?,
            verified_at = ?
        WHERE (order_id = ? OR id = ?) AND status != 'paid'
      `,
      args: [signature, now, orderId, orderId],
    });

    return this.getByOrderId(orderId);
  },

  /**
   * Verifies whether a student has a genuine paid record in Turso for mentoring
   */
  async verifyMentoringPayment(
    studentId: string,
    paymentOrOrderId: string,
    expectedAmount = 0
  ): Promise<boolean> {
    if (!paymentOrOrderId || !studentId) return false;

    const result = await db.execute({
      sql: `
        SELECT * FROM payments
        WHERE (id = ? OR order_id = ?)
          AND user_id = ?
          AND payment_type = 'mentoring'
          AND status = 'paid'
        LIMIT 1
      `,
      args: [paymentOrOrderId, paymentOrOrderId, studentId],
    });

    if (!result.rows[0]) return false;
    const row = result.rows[0] as unknown as PaymentRow;

    // Verify amount is at least expected amount
    return row.amount >= (expectedAmount || 0);
  },

  /**
   * Verifies whether a user has a genuine paid record in Turso for an event
   */
  async verifyEventPayment(
    userId: string,
    paymentOrOrderId: string,
    expectedAmount = 0
  ): Promise<boolean> {
    if (!paymentOrOrderId || !userId) return false;

    const result = await db.execute({
      sql: `
        SELECT * FROM payments
        WHERE (id = ? OR order_id = ?)
          AND user_id = ?
          AND (payment_type = 'event' OR payment_type = 'events')
          AND status = 'paid'
        LIMIT 1
      `,
      args: [paymentOrOrderId, paymentOrOrderId, userId],
    });

    if (!result.rows[0]) return false;
    const row = result.rows[0] as unknown as PaymentRow;
    return row.amount >= (expectedAmount || 0);
  },

  async createMembership(data: {
    userId: string;
    plan: string;
    startDate: number;
    endDate: number;
    paymentId?: string;
    orderId?: string;
    amount: number;
  }): Promise<MembershipRow> {
    const now = Date.now();
    const id = `mem_${now}_${Math.random().toString(36).substring(2, 7)}`;

    await db.execute({
      sql: `
        INSERT INTO memberships (
          id, user_id, plan, status, start_date, end_date,
          razorpay_payment_id, order_id, amount, version, created_at, updated_at
        ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, 1, ?, ?)
      `,
      args: [
        id,
        data.userId,
        data.plan,
        data.startDate,
        data.endDate,
        data.paymentId || null,
        data.orderId || null,
        data.amount,
        now,
        now,
      ],
    });

    const result = await db.execute({
      sql: `SELECT * FROM memberships WHERE id = ? LIMIT 1`,
      args: [id],
    });
    return result.rows[0] as unknown as MembershipRow;
  },
};
