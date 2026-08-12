import type { Metadata } from 'next'
import { SignupForm } from '@/frontend/components/auth/SignupForm'

export const metadata: Metadata = { title: 'Create Account' }

export default function SignupPage() {
  return <SignupForm />
}
