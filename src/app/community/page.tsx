'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityApi } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@/lib/utils';
import { motion } from 'framer-motion';
import { MessageSquare, Plus, Search, MessageCircle, Hash, Users, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const POST_TYPES = ['All', 'Discussion', 'Question', 'Team Matchmaking'];
const TYPE_ICONS = {
  Discussion: MessageCircle,
  Question: HelpCircle,
  'Team Matchmaking': Users,
};

const TYPE_COLORS = {
  Discussion: 'primary' as const,
  Question: 'warning' as const,
  'Team Matchmaking': 'success' as const,
};

export default function CommunityPage() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'Discussion', tags: '' });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['community'],
    queryFn: async () => {
      const res = await communityApi.list();
      const raw = res.data;
      return Array.isArray(raw) ? raw : raw?.data || [];
    },
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      communityApi.create({
        title: form.title,
        content: form.content,
        type: form.type,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        authorId: user?.uid || '',
        authorName: user?.displayName || user?.email || 'Anonymous',
      }),
    onSuccess: () => {
      toast.success('Post created!');
      setCreateOpen(false);
      setForm({ title: '', content: '', type: 'Discussion', tags: '' });
      queryClient.invalidateQueries({ queryKey: ['community'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to create post');
    },
  });

  const posts = (data || []).filter((p: any) => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || p.type === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full pb-10">
      <div className="flex items-center justify-between bg-black/40 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-400 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-fuchsia-500" /> Community
          </h1>
          <p className="text-sm text-gray-400 mt-1">Discussions, questions & team matchmaking</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            if (!isAuthenticated) { toast.error('Sign in to create a post'); return; }
            setCreateOpen(true);
          }}
        >
          New Post
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search discussions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          containerClassName="flex-1"
        />
        <div className="flex gap-2 overflow-x-auto">
          {POST_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                filter === t ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.2)]' : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8" />}
          title="No posts yet"
          description="Be the first to start a discussion!"
          action={{ label: 'Create post', onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post: any, i: number) => (
            <PostCard key={post.id} post={post} index={i} />
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Post"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="What's on your mind?"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
            <div className="flex gap-2">
              {['Discussion', 'Question', 'Team Matchmaking'].map((type) => (
                <button
                  key={type}
                  onClick={() => setForm({ ...form, type })}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-colors ${
                    form.type === type ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.2)]' : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label="Content"
            placeholder="Share your thoughts..."
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={5}
            required
          />
          <Input
            label="Tags (comma-separated)"
            placeholder="react, nextjs, typescript"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            leftIcon={<Hash className="h-4 w-4" />}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            isLoading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
            disabled={!form.title || !form.content}
          >
            Publish Post
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

function PostCard({ post, index }: { post: any; index: number }) {
  const Icon = TYPE_ICONS[post.type as keyof typeof TYPE_ICONS] || MessageCircle;
  const typeColor = TYPE_COLORS[post.type as keyof typeof TYPE_COLORS] || 'default';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      <Card hover padding="sm">
        <div className="flex gap-3">
          <Avatar name={post.authorName} size="sm" className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h3 className="text-base font-bold text-white line-clamp-2 hover:text-fuchsia-400 transition-colors cursor-pointer">
                {post.title}
              </h3>
              <Badge variant={typeColor} className="shrink-0">
                <Icon className="h-3 w-3" />
                {post.type}
              </Badge>
            </div>
            {post.content && (
              <p className="text-xs text-foreground-muted line-clamp-2 mb-2">{post.content}</p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {post.tags?.slice(0, 3).map((tag: string) => (
                  <span key={tag} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-gray-400">
                <span className="flex items-center gap-1 hover:text-fuchsia-400 cursor-pointer transition-colors">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {post.repliesCount || 0}
                </span>
                <span>{formatRelativeTime(post.createdAt)}</span>
              </div>
            </div>
            <p className="text-[10px] text-foreground-muted mt-1.5">by {post.authorName}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
