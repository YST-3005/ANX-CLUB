'use client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
export default function Page() {
  return (
    <div className='max-w-2xl mx-auto space-y-6'>
      <Link href='' className='inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground'>
        <ArrowLeft className='h-4 w-4' /> Back
      </Link>
      <Card padding='lg'>
        <h1 className='text-xl font-semibold text-foreground mb-2'></h1>
        <p className='text-sm text-foreground-muted'></p>
      </Card>
    </div>
  );
}