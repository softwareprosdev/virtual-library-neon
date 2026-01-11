'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to new Explore page
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/explore');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting to Explore...</p>
    </div>
  );
}
