export type EventCategory = 'workshop' | 'webinar' | 'networking' | 'hackathon' | 'conference' | 'mentoring' | 'other'
export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled'

export interface Event {
  id: string
  title: string
  description: string
  category: EventCategory
  status: EventStatus
  date: Date
  time: string
  endTime?: string
  duration: number
  venue: string
  address?: string
  isOnline?: boolean
  meetingLink?: string
  speaker?: string
  speakerBio?: string
  speakerImage?: string
  agenda?: string[]
  capacity: number
  seatsAvailable: number
  registeredCount: number
  price: number
  premiumDiscount?: number
  premiumOnly?: boolean
  registeredUsers: string[]
  posterUrl?: string
  coverImageUrl?: string
  isRegistered?: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
