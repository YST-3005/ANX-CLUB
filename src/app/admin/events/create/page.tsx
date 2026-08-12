'use client';

import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const schema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(10, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  venue: z.string().optional(),
  speakerName: z.string().optional(),
  eventType: z.string().min(1, 'Event type is required'),
  price: z.coerce.number().min(0).optional(),
  premiumPrice: z.coerce.number().min(0).optional(),
  seatsAvailable: z.coerce.number().min(1).optional(),
  registrationDeadline: z.string().optional(),
  onlineLink: z.string().url().optional().or(z.literal('')),
  posterUrl: z.string().url().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

const EVENT_TYPES = ['Workshop', 'Seminar', 'Hackathon', 'Webinar', 'Networking', 'Other'];

export default function CreateEventPage() {
  const router = useRouter();
  const { user } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { price: 0, premiumPrice: 0 },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await api.post('/events', values, {
        headers: { 'x-user-id': user?.uid || '' },
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Event created successfully!');
      router.push('/admin/events');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create event');
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/admin/events" className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-foreground">Create New Event</h1>
        <p className="text-sm text-foreground-muted mt-0.5">Fill in the details below to create an event.</p>
      </div>

      <form onSubmit={handleSubmit((values) => createMutation.mutate(values as FormValues))} className="space-y-5">
        <Card>
          <h2 className="text-sm font-semibold text-foreground mb-4">Basic Information</h2>
          <div className="space-y-4">
            <Input label="Event Title *" placeholder="e.g. React Workshop 2024" {...register('title')} error={errors.title?.message} />
            <Textarea label="Description *" placeholder="Describe the event..." rows={4} {...register('description')} error={errors.description?.message} />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Event Type *</label>
              <select
                {...register('eventType')}
                className="w-full h-9 rounded-lg border border-border bg-surface text-foreground text-sm px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Select type...</option>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.eventType && <p className="text-xs text-danger mt-1">{errors.eventType.message}</p>}
            </div>
            <Input label="Speaker Name" placeholder="e.g. John Doe" {...register('speakerName')} />
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-foreground mb-4">Date & Location</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Event Date & Time *" type="datetime-local" {...register('date')} error={errors.date?.message} />
            <Input label="Registration Deadline" type="datetime-local" {...register('registrationDeadline')} />
            <Input label="Venue" placeholder="e.g. Online / Hall A" {...register('venue')} containerClassName="sm:col-span-2" />
            <Input label="Online Link" placeholder="https://meet.google.com/..." {...register('onlineLink')} error={errors.onlineLink?.message} containerClassName="sm:col-span-2" />
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-foreground mb-4">Pricing & Seats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Price (₹)" type="number" placeholder="0 = Free" {...register('price')} error={errors.price?.message} />
            <Input label="Premium Price (₹)" type="number" placeholder="Discounted price" {...register('premiumPrice')} />
            <Input label="Available Seats" type="number" placeholder="Leave blank = unlimited" {...register('seatsAvailable')} />
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-foreground mb-4">Media</h2>
          <Input label="Poster URL" placeholder="https://..." {...register('posterUrl')} error={errors.posterUrl?.message} />
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/admin/events">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button type="submit" variant="primary" isLoading={createMutation.isPending}>
            Create Event
          </Button>
        </div>
      </form>
    </div>
  );
}
