'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import EpubReader from '@/components/EpubReader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowLeft, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';

function ReaderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get('url');
  const title = searchParams.get('title');
  const source = searchParams.get('source'); // 'archive', 'openlibrary', 'epub', etc.
  const [isClient, setIsClient] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

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
          <p className="text-muted-foreground mb-4">
            Please provide a book URL to start reading.
          </p>
          <Button onClick={() => router.push('/explore')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Browse Books
          </Button>
        </Card>
      </div>
    );
  }

  const decodedUrl = decodeURIComponent(url);

  // Handle Archive.org books with their embedded reader
  if (source === 'archive' || decodedUrl.includes('archive.org')) {
    // Convert to proper embed URL if needed
    let embedUrl = decodedUrl;
    if (!decodedUrl.includes('ui=embed')) {
      const archiveId = decodedUrl.match(/\/stream\/([^/?]+)/)?.[1] || 
                        decodedUrl.match(/\/details\/([^/?]+)/)?.[1];
      if (archiveId) {
        embedUrl = `https://archive.org/embed/${archiveId}`;
      }
    }

    return (
      <div className="h-screen flex flex-col bg-black">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-card/80 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-sm font-medium truncate max-w-[200px] md:max-w-md">
              {title || 'Reading'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.open(decodedUrl.replace('ui=embed', '').replace('/embed/', '/details/'), '_blank')}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Embedded Archive.org Reader */}
        <iframe
          src={embedUrl}
          className="flex-1 w-full border-0"
          allowFullScreen
          title={title || 'Book Reader'}
        />
      </div>
    );
  }

  // Handle Open Library or other iframe-based sources
  if (source === 'openlibrary' || decodedUrl.includes('openlibrary.org')) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="flex items-center justify-between p-3 bg-card/80 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-sm font-medium truncate max-w-[200px] md:max-w-md">
              {title || 'Reading'}
            </h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.open(decodedUrl, '_blank')}>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
        <iframe
          src={decodedUrl}
          className="flex-1 w-full border-0"
          allowFullScreen
          title={title || 'Book Reader'}
        />
      </div>
    );
  }

  // Default: EPUB/PDF Reader
  return <EpubReader url={decodedUrl} title={title || undefined} />;
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

