export type UserRole = 'student' | 'mentor' | 'admin' | 'visitor'
export type MembershipTier = 'free' | 'premium'

export interface User {
  id: string
  email: string
  fullName: string
  avatar?: string
  phone?: string
  college: string
  year: string
  branch: string
  bio?: string
  skills: string[]
  interests: string[]
  role: UserRole
  linkedinUrl?: string
  githubUrl?: string
  portfolioUrl?: string
  membershipTier: MembershipTier
  membershipExpiry?: Date
  registeredEvents: string[]
  completedEvents: string[]
  mentorBookings: string[]
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
  isActive: boolean
}
