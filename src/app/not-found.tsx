'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-surface border border-border mx-auto">
          <Zap className="h-8 w-8 text-foreground-muted" />
        </div>
        <div>
          <p className="text-6xl font-bold text-foreground/10 mb-2">404</p>
          <h1 className="text-xl font-semibold text-foreground">Page Not Found</h1>
          <p className="text-sm text-foreground-muted mt-2 max-w-sm">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Link href="/">
          <Button variant="primary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
