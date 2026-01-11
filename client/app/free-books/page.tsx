'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to Explore page with free books tab
export default function FreeBooksPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/explore?source=free');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting to Explore...</p>
    </div>
  );
}
