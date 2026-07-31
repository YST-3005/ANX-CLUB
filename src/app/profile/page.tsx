'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Shield, LogOut, Edit, Calendar, Zap } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex gap-5">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2 pt-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) return null;

  const roleVariant = user.role === 'Admin' ? 'danger' : user.role === 'Mentor' ? 'primary' : 'success';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Profile</h1>
        <div className="flex items-center gap-2">
          <Link href="/profile/edit">
            <Button variant="secondary" size="sm" leftIcon={<Edit className="h-4 w-4" />}>
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<LogOut className="h-4 w-4" />}
            onClick={logout}
            className="text-danger border-danger/30 hover:bg-danger/10"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Identity Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <div className="flex items-start gap-5">
            <Avatar
              name={user.displayName || user.email || 'User'}
              src={user.photoURL}
              size="xl"
            />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">
                {user.displayName || 'User'}
              </h2>
              <p className="text-sm text-foreground-muted mt-0.5">
                {user.email || user.phoneNumber || 'No contact info'}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant={roleVariant} dot>
                  {user.role || 'Member'}
                </Badge>
                <Badge variant="default">
                  <Zap className="h-3 w-3" />
                  A.N.X Platform
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Info Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {[
          {
            icon: User,
            label: 'Full Name',
            value: user.displayName || 'Not set',
            empty: !user.displayName,
          },
          {
            icon: Mail,
            label: 'Email',
            value: user.email || 'Not set',
            empty: !user.email,
          },
          {
            icon: Phone,
            label: 'Phone',
            value: user.phoneNumber || 'Not set',
            empty: !user.phoneNumber,
          },
          {
            icon: Shield,
            label: 'Role',
            value: user.role || 'Member',
            empty: false,
          },
        ].map((item) => (
          <Card key={item.label} padding="sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-surface-hover">
                <item.icon className="h-4 w-4 text-foreground-muted" />
              </div>
              <div>
                <p className="text-xs text-foreground-muted">{item.label}</p>
                <p className={`text-sm font-medium ${item.empty ? 'text-foreground-muted italic' : 'text-foreground'}`}>
                  {item.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Account Security */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <h2 className="text-sm font-semibold text-foreground mb-4">Account Security</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">User ID</p>
                <p className="text-xs text-foreground-muted font-mono truncate max-w-xs">{user.uid}</p>
              </div>
              <Badge variant="success" dot>Active</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Authentication</p>
                <p className="text-xs text-foreground-muted">
                  {user.email ? 'Email / Google' : 'Phone OTP'}
                </p>
              </div>
              <Badge variant="primary">Verified</Badge>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <h2 className="text-sm font-semibold text-foreground mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'My Events', href: '/events', icon: Calendar },
              { label: 'Booked Mentors', href: '/mentors', icon: User },
              { label: 'My Projects', href: '/projects/my-projects', icon: Zap },
              { label: 'Membership', href: '/membership', icon: Shield },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2.5 p-3 rounded-lg border border-border hover:bg-surface-hover hover:border-border-strong transition-all group"
              >
                <link.icon className="h-4 w-4 text-foreground-muted group-hover:text-primary transition-colors" />
                <span className="text-sm text-foreground-secondary group-hover:text-foreground transition-colors">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
