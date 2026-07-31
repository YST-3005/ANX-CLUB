'use client';

import { useQuery } from '@tanstack/react-query';
import { mentorsApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { motion } from 'framer-motion';
import { Search, Star, Clock, Users2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function MentorsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['mentors'],
    queryFn: async () => {
      const res = await mentorsApi.list();
      const raw = res.data;
      return Array.isArray(raw) ? raw : raw?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const mentors = (data || []).filter((mentor: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return mentor.name?.toLowerCase().includes(q) || mentor.expertise?.some((e: string) => e.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full pb-10">
      <div className="flex items-center justify-between bg-black/40 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400 flex items-center gap-2">
            <Users2 className="h-6 w-6 text-orange-400" /> Mentors
          </h1>
          <p className="text-sm text-gray-400 mt-1">Book 1:1 sessions with industry experts</p>
        </div>
      </div>

      <Input
        placeholder="Search by name or skill..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search className="h-4 w-4" />}
        containerClassName="max-w-sm"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : mentors.length === 0 ? (
        <EmptyState
          icon={<Users2 className="h-8 w-8" />}
          title="No mentors found"
          description="Try different search terms"
          action={{ label: 'Clear search', onClick: () => setSearch('') }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {mentors.map((mentor: any, i: number) => (
            <MentorCard key={mentor.id} mentor={mentor} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function MentorCard({ mentor, index }: { mentor: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card hover padding="md" className="flex flex-col gap-4 h-full group">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar name={mentor.name} src={mentor.photoUrl} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors truncate">
              {mentor.name}
            </h3>
            <p className="text-xs text-gray-400">{mentor.title || mentor.designation}</p>
            {mentor.company && (
              <p className="text-xs text-gray-400">{mentor.company}</p>
            )}
          </div>
          {mentor.isAvailable !== false && (
            <Badge variant="success" dot className="shrink-0">Available</Badge>
          )}
        </div>

        {/* Rating */}
        {mentor.rating && (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-3.5 w-3.5 ${star <= Math.round(mentor.rating) ? 'text-warning fill-warning' : 'text-foreground-muted'}`}
              />
            ))}
            <span className="text-xs text-gray-400 ml-1">
              {mentor.rating} ({mentor.reviewsCount || 0} reviews)
            </span>
          </div>
        )}

        {/* Bio */}
        {mentor.bio && (
          <p className="text-xs text-gray-400 line-clamp-2">{mentor.bio}</p>
        )}

        {/* Skills */}
        {mentor.expertise?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {mentor.expertise.slice(0, 4).map((skill: string) => (
              <Badge key={skill} variant="default">{skill}</Badge>
            ))}
            {mentor.expertise.length > 4 && (
              <Badge variant="muted">+{mentor.expertise.length - 4}</Badge>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          {mentor.sessionDuration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {mentor.sessionDuration} min sessions
            </span>
          )}
          {mentor.sessionsCompleted !== undefined && (
            <span className="flex items-center gap-1">
              <Users2 className="h-3.5 w-3.5" />
              {mentor.sessionsCompleted} sessions
            </span>
          )}
        </div>

        {/* CTA */}
        <Link href={`/mentors/${mentor.id}`} className="mt-auto block">
          <Button variant="primary" size="sm" className="w-full" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
            View Profile & Book
          </Button>
        </Link>
      </Card>
    </motion.div>
  );
}
