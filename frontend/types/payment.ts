export interface Payment {
  id: string; userId: string; orderId: string; paymentId?: string
  amount: number; currency: string
  status: 'pending' | 'captured' | 'failed' | 'refunded'
  type: 'subscription' | 'event'; relatedId?: string
  receipt?: string; notes?: string
  createdAt: Date; updatedAt: Date; completedAt?: Date
}
