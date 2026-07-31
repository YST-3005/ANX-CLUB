'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { formatDate, formatCurrency, isUpcoming } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Search, Filter, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const EVENT_TYPES = ['All', 'Workshop', 'Seminar', 'Hackathon', 'Webinar', 'Networking'];
const FILTER_OPTIONS = ['All', 'Upcoming', 'Past', 'Free', 'Paid'];

export default function EventsPage() {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedFilter, setSelectedFilter] = useState('All');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await eventsApi.list();
      const raw = res.data;
      return Array.isArray(raw) ? raw : raw?.data || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const events = (data || []).filter((event: any) => {
    const matchSearch = !search || event.title?.toLowerCase().includes(search.toLowerCase()) || event.speakerName?.toLowerCase().includes(search.toLowerCase());
    const matchType = selectedType === 'All' || event.eventType === selectedType;
    const up = isUpcoming(event.date);
    const matchFilter =
      selectedFilter === 'All' ||
      (selectedFilter === 'Upcoming' && up) ||
      (selectedFilter === 'Past' && !up) ||
      (selectedFilter === 'Free' && (!event.price || event.price === 0)) ||
      (selectedFilter === 'Paid' && event.price > 0);
    return matchSearch && matchType && matchFilter;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full pb-10">
      <div className="flex items-center justify-between bg-black/40 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-cyan-400" /> Events
          </h1>
          <p className="text-sm text-gray-400 mt-1">Discover workshops, meetups, and conferences</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search events or speakers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          containerClassName="flex-1"
        />
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFilter(f)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                selectedFilter === f
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                  : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {EVENT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-colors border ${
              selectedType === type
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Event Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-8 w-8" />}
          title="No events found"
          description="Try adjusting your filters or check back later for new events."
          action={{ label: 'Clear filters', onClick: () => { setSearch(''); setSelectedType('All'); setSelectedFilter('All'); } }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event: any, i: number) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, index }: { event: any; index: number }) {
  const upcoming = isUpcoming(event.date);
  const isFree = !event.price || event.price === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card hover padding="none" className="flex flex-col overflow-hidden h-full group">
        {/* Color band */}
        <div className="h-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:from-cyan-300 group-hover:to-blue-400 transition-all shadow-[0_0_10px_rgba(34,211,238,0.5)]" />

        <div className="flex flex-col flex-1 p-5 bg-black/20">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-3">
            <Badge variant={upcoming ? 'success' : 'muted'} dot>
              {upcoming ? 'Upcoming' : 'Past'}
            </Badge>
            <Badge variant="default">{event.eventType || 'Event'}</Badge>
            <Badge variant={isFree ? 'success' : 'warning'} className="ml-auto">
              {isFree ? 'Free' : formatCurrency(event.price)}
            </Badge>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>

          {/* Description */}
          {event.description && (
            <p className="text-xs text-foreground-muted line-clamp-2 mb-4">
              {event.description}
            </p>
          )}

          <div className="mt-auto space-y-2">
            {/* Meta */}
            <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {formatDate(event.date)}
              {event.date && (
                <>
                  <Clock className="h-3.5 w-3.5 shrink-0 ml-1" />
                  {new Date(event.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {event.venue || 'Online'}
            </div>
            {(event.seatsAvailable !== undefined && event.seatsAvailable !== null) && (
              <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <Users className="h-3.5 w-3.5 shrink-0" />
                {event.seatsBooked || 0} / {event.seatsAvailable} seats
              </div>
            )}
          </div>

          {/* CTA */}
          <Link href={`/events/${event.id}`} className="mt-4 block">
            <Button variant={upcoming ? 'primary' : 'secondary'} size="sm" className="w-full" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
              {upcoming ? 'View & Register' : 'View Details'}
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
