'use client';

import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { FolderGit2, ExternalLink, Code as GithubIcon, ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const projects = data || [];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full pb-10">
      <div className="flex items-center justify-between bg-black/40 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center gap-2">
            <FolderGit2 className="h-6 w-6 text-emerald-400" /> Projects
          </h1>
          <p className="text-sm text-gray-400 mt-1">Community-built projects and initiatives</p>
        </div>
        <Link href="/projects/new">
          <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>Submit Project</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 className="h-8 w-8" />}
          title="No projects yet"
          description="Submit your project to showcase your work to the community."
          action={{ label: 'Submit Project', onClick: () => {} }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project: any, i: number) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Card hover padding="md" className="flex flex-col gap-3 h-full group">
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-surface-hover text-foreground-muted">
                    <FolderGit2 className="h-5 w-5" />
                  </div>
                  <Badge variant={project.status === 'Approved' ? 'success' : project.status === 'In Review' ? 'warning' : 'muted'} dot>
                    {project.status || 'Submitted'}
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {project.title || project.name}
                </h3>
                {project.description && (
                  <p className="text-xs text-foreground-muted line-clamp-2">{project.description}</p>
                )}
                {project.techStack?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {project.techStack.slice(0, 3).map((tech: string) => (
                      <Badge key={tech} variant="default">{tech}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
                  {project.githubUrl && (
                    <a href={project.githubUrl} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="xs" leftIcon={<GithubIcon className="h-3.5 w-3.5" />}>Code</Button>
                    </a>
                  )}
                  {project.liveUrl && (
                    <a href={project.liveUrl} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="xs" leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>Live</Button>
                    </a>
                  )}
                  <Link href={`/projects/${project.id}`} className="ml-auto">
                    <Button variant="secondary" size="xs" rightIcon={<ArrowRight className="h-3 w-3" />}>View</Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
