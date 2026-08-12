export interface MembershipTierConfig {
  name: string; price: number; description: string; features: string[]
  limits: { eventRegistrations?: number; mentorHours?: number }
}
export interface Subscription {
  id: string; userId: string; tier: 'free' | 'premium'
  status: 'active' | 'inactive' | 'cancelled'
  currentPeriodStart: Date; currentPeriodEnd: Date
  cancelledAt?: Date; autoRenew: boolean; paymentMethod?: string
}
