'use client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
export default function Page() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full pb-10">
      <div className="flex items-center justify-between bg-black/40 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400 flex items-center gap-2">
            Roadmaps
          </h1>
          <p className="text-sm text-gray-400 mt-1">Curated learning paths</p>
        </div>
      </div>
      <Card padding='lg' className="bg-black/20">
        <h1 className='text-xl font-semibold text-white mb-2'>Coming Soon</h1>
        <p className='text-sm text-gray-400'>Roadmaps are currently under construction.</p>
      </Card>
    </div>
  );
}