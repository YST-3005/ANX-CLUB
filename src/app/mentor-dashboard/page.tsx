'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MentorDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/mentor/dashboard');
  }, [router]);

  return (
    <div className="py-20 text-center text-white text-xs">
      Redirecting to Mentor Dashboard...
    </div>
  );
}
