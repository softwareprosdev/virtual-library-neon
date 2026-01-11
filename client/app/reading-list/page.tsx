'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to Library page
export default function ReadingListPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/library');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting to Library...</p>
    </div>
  );
}
