'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi, paymentsApi } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { formatDate, formatDateTime, formatCurrency, isUpcoming } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Mic,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Share2,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Params { id: string }

export default function EventDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: event, isLoading, isError, refetch } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const res = await eventsApi.get(id);
      const raw = res.data;
      return raw?.data || raw;
    },
  });

  const registerMutation = useMutation({
    mutationFn: () => eventsApi.register(id),
    onSuccess: () => {
      toast.success('Successfully registered!');
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to register');
    },
  });

  const handleRegister = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to register');
      return;
    }

    // If paid event, create Razorpay order
    if (event?.price > 0) {
      try {
        const orderRes = await paymentsApi.createOrder({
          amount: event.price * 100, // paise
          eventId: id,
        });
        const order = orderRes.data;

        if (typeof window !== 'undefined' && (window as any).Razorpay) {
          const rzp = new (window as any).Razorpay({
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency || 'INR',
            name: 'A.N.X Platform',
            description: event.title,
            order_id: order.id,
            handler: async (response: any) => {
              try {
                await paymentsApi.verify(response);
                await eventsApi.register(id);
                toast.success('Payment successful! Registered.');
                queryClient.invalidateQueries({ queryKey: ['event', id] });
              } catch {
                toast.error('Payment verification failed');
              }
            },
            prefill: {
              email: user?.email || '',
            },
            theme: { color: '#6366f1' },
          });
          rzp.open();
        } else {
          toast.error('Payment system not loaded. Try refreshing.');
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to create order');
      }
      return;
    }

    registerMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !event) {
    return <ErrorState onRetry={refetch} description="Could not load event details." />;
  }

  const upcoming = isUpcoming(event.date);
  const isFree = !event.price || event.price === 0;
  const isFull = event.seatsAvailable !== null && event.seatsBooked >= event.seatsAvailable;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant={upcoming ? 'success' : 'muted'} dot>
                {upcoming ? 'Upcoming' : 'Past'}
              </Badge>
              {event.eventType && <Badge variant="default">{event.eventType}</Badge>}
              <Badge variant={isFree ? 'success' : 'warning'}>
                {isFree ? 'Free Entry' : formatCurrency(event.price)}
              </Badge>
            </div>

            <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
              {event.title}
            </h1>

            <p className="text-foreground-secondary leading-relaxed">
              {event.description}
            </p>
          </motion.div>

          {/* Details Card */}
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Calendar, label: 'Date', value: formatDate(event.date) },
                { icon: Clock, label: 'Time', value: event.date ? new Date(event.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : 'TBA' },
                { icon: MapPin, label: 'Venue', value: event.venue || 'Online' },
                ...(event.speakerName ? [{ icon: Mic, label: 'Speaker', value: event.speakerName }] : []),
                ...(event.seatsAvailable ? [{ icon: Users, label: 'Seats', value: `${event.seatsBooked || 0} / ${event.seatsAvailable} registered` }] : []),
              ].map((detail) => (
                <div key={detail.label} className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-surface-hover text-foreground-muted shrink-0">
                    <detail.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted">{detail.label}</p>
                    <p className="text-sm font-medium text-foreground">{detail.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Online link */}
          {event.onlineLink && (
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Online Meeting Link</p>
                  <p className="text-xs text-foreground-muted mt-0.5">Click to join the session</p>
                </div>
                <a href={event.onlineLink} target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm" rightIcon={<ExternalLink className="h-3.5 w-3.5" />}>
                    Join
                  </Button>
                </a>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Registration Card */}
          <Card className="sticky top-20">
            <div className="text-center mb-4">
              <p className="text-2xl font-bold text-foreground">
                {isFree ? 'Free' : formatCurrency(event.price)}
              </p>
              {!isFree && event.premiumPrice > 0 && (
                <p className="text-xs text-foreground-muted mt-0.5">
                  Premium members: {formatCurrency(event.premiumPrice)}
                </p>
              )}
            </div>

            {/* Seat progress */}
            {event.seatsAvailable && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-foreground-muted mb-1.5">
                  <span>{event.seatsBooked || 0} registered</span>
                  <span>{event.seatsAvailable} total</span>
                </div>
                <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((event.seatsBooked || 0) / event.seatsAvailable) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {upcoming ? (
              <Button
                variant={isFull ? 'secondary' : 'primary'}
                className="w-full"
                isLoading={registerMutation.isPending}
                onClick={handleRegister}
                disabled={isFull}
              >
                {isFull ? 'Event Full' : registerMutation.isSuccess ? (
                  <><CheckCircle className="h-4 w-4" /> Registered!</>
                ) : isFree ? 'Register for Free' : `Pay ${formatCurrency(event.price)}`}
              </Button>
            ) : (
              <Button variant="secondary" className="w-full" disabled>
                Event Ended
              </Button>
            )}

            {event.registrationDeadline && (
              <p className="text-xs text-foreground-muted text-center mt-3">
                Registration closes {formatDateTime(event.registrationDeadline)}
              </p>
            )}

            <button className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors">
              <Share2 className="h-3.5 w-3.5" />
              Share event
            </button>
          </Card>

          {/* Organizer */}
          {event.createdBy && (
            <Card>
              <p className="text-xs text-foreground-muted mb-2">Organized by</p>
              <div className="flex items-center gap-2">
                <Avatar name="A.N.X Team" size="sm" />
                <p className="text-sm font-medium text-foreground">A.N.X Team</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
