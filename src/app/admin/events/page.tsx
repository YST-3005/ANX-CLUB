'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { formatDate, formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function AdminEventsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const res = await adminApi.getEvents();
      const raw = res.data;
      return Array.isArray(raw) ? raw : raw?.data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveEvent(id),
    onSuccess: (_, id) => {
      toast.success('Event approved!');
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
    },
    onError: () => toast.error('Failed to approve event'),
  });

  const events = data || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Events Management</h1>
          <p className="text-sm text-foreground-muted mt-0.5">{events.length} total events</p>
        </div>
        <Link href="/admin/events/create">
          <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
            Create Event
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <Card><SkeletonTable rows={6} cols={5} /></Card>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : events.length === 0 ? (
        <EmptyState icon={<Calendar className="h-8 w-8" />} title="No events found" description="Create your first event." action={{ label: 'Create Event', onClick: () => {} }} />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-hover">
                  {['Title', 'Date', 'Type', 'Price', 'Seats', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event: any, i: number) => (
                  <motion.tr
                    key={event.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground truncate max-w-[200px]">{event.title}</p>
                        {event.speakerName && <p className="text-xs text-foreground-muted">{event.speakerName}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary whitespace-nowrap">{formatDate(event.date)}</td>
                    <td className="px-4 py-3"><Badge variant="default">{event.eventType || '—'}</Badge></td>
                    <td className="px-4 py-3 text-foreground-secondary">{event.price ? formatCurrency(event.price) : 'Free'}</td>
                    <td className="px-4 py-3 text-foreground-secondary">
                      {event.seatsAvailable ? `${event.seatsBooked || 0}/${event.seatsAvailable}` : '∞'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={event.status === 'Approved' ? 'success' : event.status === 'Rejected' ? 'danger' : 'warning'} dot>
                        {event.status || 'Pending'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {event.status !== 'Approved' && (
                          <Button
                            variant="secondary"
                            size="xs"
                            isLoading={approveMutation.isPending}
                            onClick={() => approveMutation.mutate(event.id)}
                            leftIcon={<CheckCircle className="h-3.5 w-3.5" />}
                          >
                            Approve
                          </Button>
                        )}
                        <Link href={`/admin/events/${event.id}/registrations`}>
                          <Button variant="ghost" size="xs" leftIcon={<Users className="h-3.5 w-3.5" />}>
                            Registrations
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
