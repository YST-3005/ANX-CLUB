'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { StatCard, Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Calendar, Users, CheckCircle, Clock, ArrowRight, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const res = await adminApi.getEvents();
      const raw = res.data;
      return Array.isArray(raw) ? raw : raw?.data || [];
    },
    enabled: !!user,
  });

  if (authLoading || eventsLoading) return <SkeletonDashboard />;

  const pendingEvents = (events || []).filter((e: any) => !e.status || e.status === 'Pending');
  const approvedEvents = (events || []).filter((e: any) => e.status === 'Approved');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Admin Dashboard</h1>
          </div>
          <p className="text-sm text-foreground-muted">Platform management & oversight</p>
        </div>
        <Link href="/admin/events/create">
          <Button variant="primary" size="sm">+ Create Event</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={events?.length || 0} icon={<Calendar className="h-4 w-4" />} iconColor="text-primary" />
        <StatCard label="Pending Approval" value={pendingEvents.length} delta="Needs review" deltaType="down" icon={<Clock className="h-4 w-4" />} iconColor="text-warning" />
        <StatCard label="Approved Events" value={approvedEvents.length} icon={<CheckCircle className="h-4 w-4" />} iconColor="text-success" />
        <StatCard label="Registered Users" value="—" icon={<Users className="h-4 w-4" />} iconColor="text-violet-500" />
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Manage Events', href: '/admin/events', desc: 'Create, approve & manage events', color: 'text-primary', icon: Calendar },
          { label: 'Manage Users', href: '/admin/users', desc: 'View and update user roles', color: 'text-violet-500', icon: Users },
          { label: 'Manage Mentors', href: '/admin/mentors', desc: 'Add mentors, approve requests', color: 'text-success', icon: Shield },
          { label: 'Manage Projects', href: '/admin/projects', desc: 'Review and update projects', color: 'text-warning', icon: CheckCircle },
        ].map((item, i) => (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Link href={item.href}>
              <Card hover padding="md" className="h-full group">
                <div className={`p-2.5 rounded-xl bg-surface-hover w-fit mb-3 ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                  {item.label}
                </p>
                <p className="text-xs text-foreground-muted">{item.desc}</p>
                <ArrowRight className="h-4 w-4 text-foreground-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-3" />
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Pending Events */}
      {pendingEvents.length > 0 && (
        <Card padding="none">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <h2 className="text-sm font-semibold text-foreground">Pending Approvals</h2>
            </div>
            <Badge variant="warning">{pendingEvents.length} pending</Badge>
          </div>
          <div className="divide-y divide-border">
            {pendingEvents.slice(0, 5).map((event: any) => (
              <div key={event.id} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                  <p className="text-xs text-foreground-muted">{formatDate(event.date)} · {event.eventType}</p>
                </div>
                <Badge variant="warning" dot>Pending</Badge>
                <Link href="/admin/events">
                  <Button variant="secondary" size="xs">Review</Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
