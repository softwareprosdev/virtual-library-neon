'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import EpubReader from '@/components/EpubReader';
import { Card } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

function ReaderContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');
  const title = searchParams.get('title');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Initializing reader...</p>
        </div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="p-8 max-w-md text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">No Book Selected</h2>
          <p className="text-muted-foreground">
            Please provide a book URL to start reading.
          </p>
        </Card>
      </div>
    );
  }

  return <EpubReader url={decodeURIComponent(url)} title={title || undefined} />;
}

export default function ReaderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading reader...</p>
        </div>
      </div>
    }>
      <ReaderContent />
    </Suspense>
  );
}
