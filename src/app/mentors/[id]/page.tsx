'use client';

import { use } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { mentorsApi } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Clock, Calendar, Briefcase, CheckCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useState } from 'react';

interface Params { id: string }

export default function MentorDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const { user, isAuthenticated } = useAuth();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [date, setDate] = useState('');
  const [message, setMessage] = useState('');

  const { data: mentor, isLoading, isError, refetch } = useQuery({
    queryKey: ['mentor', id],
    queryFn: async () => {
      const res = await mentorsApi.get(id);
      return res.data?.data || res.data;
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['mentor-reviews', id],
    queryFn: async () => {
      const res = await mentorsApi.getReviews(id);
      const raw = res.data;
      return Array.isArray(raw) ? raw : raw?.data || [];
    },
  });

  const bookMutation = useMutation({
    mutationFn: () => mentorsApi.book(id, { scheduledAt: date, message, userId: user?.uid }),
    onSuccess: () => {
      toast.success('Session booked successfully!');
      setBookingOpen(false);
      setDate('');
      setMessage('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to book session');
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !mentor) return <ErrorState onRetry={refetch} />;

  const avgRating = reviews.length
    ? (reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : mentor?.rating || null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/mentors" className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Mentors
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile */}
        <div className="lg:col-span-2 space-y-5">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <div className="flex items-start gap-5">
                <Avatar name={mentor.name} src={mentor.photoUrl} size="xl" />
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-foreground">{mentor.name}</h1>
                  <p className="text-sm text-foreground-secondary mt-0.5">
                    {mentor.title || mentor.designation}
                    {mentor.company && ` at ${mentor.company}`}
                  </p>

                  {avgRating && (
                    <div className="flex items-center gap-1.5 mt-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-4 w-4 ${s <= Math.round(Number(avgRating)) ? 'text-warning fill-warning' : 'text-foreground-muted'}`} />
                      ))}
                      <span className="text-sm text-foreground-secondary">{avgRating}</span>
                      <span className="text-xs text-foreground-muted">({reviews.length} reviews)</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-3">
                    {mentor.isAvailable !== false && <Badge variant="success" dot>Available</Badge>}
                    {mentor.yearsOfExperience && <Badge variant="default"><Briefcase className="h-3 w-3" />{mentor.yearsOfExperience}y exp</Badge>}
                    {mentor.sessionDuration && <Badge variant="default"><Clock className="h-3 w-3" />{mentor.sessionDuration}min</Badge>}
                  </div>
                </div>
              </div>

              {mentor.bio && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-foreground-secondary leading-relaxed">{mentor.bio}</p>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Skills */}
          {mentor.expertise?.length > 0 && (
            <Card>
              <h2 className="text-sm font-semibold text-foreground mb-3">Areas of Expertise</h2>
              <div className="flex flex-wrap gap-2">
                {mentor.expertise.map((skill: string) => (
                  <Badge key={skill} variant="primary">{skill}</Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Reviews */}
          <Card padding="none">
            <div className="p-5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Reviews ({reviews.length})</h2>
            </div>
            <div className="divide-y divide-border">
              {reviews.length === 0 ? (
                <div className="p-8 text-center text-sm text-foreground-muted">No reviews yet</div>
              ) : (
                reviews.slice(0, 5).map((review: any) => (
                  <div key={review.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={review.reviewerName || 'User'} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">{review.reviewerName || 'Anonymous'}</p>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'text-warning fill-warning' : 'text-foreground-muted'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-foreground-muted mt-1">{review.content || review.review}</p>
                        <p className="text-[10px] text-foreground-muted mt-1.5">{formatDate(review.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar: Booking */}
        <div>
          <Card className="sticky top-20">
            <div className="text-center mb-4">
              <p className="text-2xl font-bold text-foreground">
                {mentor.sessionFee ? `₹${mentor.sessionFee}` : 'Free'}
              </p>
              <p className="text-xs text-foreground-muted">per session</p>
            </div>

            <div className="space-y-3 mb-5 text-sm">
              {mentor.sessionDuration && (
                <div className="flex justify-between text-foreground-secondary">
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Duration</span>
                  <span className="font-medium text-foreground">{mentor.sessionDuration} min</span>
                </div>
              )}
              {mentor.sessionsCompleted !== undefined && (
                <div className="flex justify-between text-foreground-secondary">
                  <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4" /> Sessions done</span>
                  <span className="font-medium text-foreground">{mentor.sessionsCompleted}</span>
                </div>
              )}
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                if (!isAuthenticated) { toast.error('Please sign in first'); return; }
                setBookingOpen(true);
              }}
            >
              Book a Session
            </Button>

            <Link href="/community" className="mt-3 block">
              <Button variant="ghost" size="sm" className="w-full" leftIcon={<MessageSquare className="h-4 w-4" />}>
                Ask in Community
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      {/* Booking Modal */}
      <Modal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} title="Book a Session" size="md">
        <div className="space-y-4">
          <Input
            label="Preferred Date & Time"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            leftIcon={<Calendar className="h-4 w-4" />}
            required
          />
          <Textarea
            label="Message to Mentor (optional)"
            placeholder="What would you like to discuss?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setBookingOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            isLoading={bookMutation.isPending}
            onClick={() => bookMutation.mutate()}
            disabled={!date}
          >
            Confirm Booking
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
