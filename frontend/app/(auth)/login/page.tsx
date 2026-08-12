import type { Metadata } from 'next'
import { LoginForm } from '@/frontend/components/auth/LoginForm'

export const metadata: Metadata = { title: 'Sign In' }

export default function LoginPage() {
  return <LoginForm />
}
