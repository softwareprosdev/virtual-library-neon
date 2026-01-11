'use client';

import { useEffect, useRef, useState } from 'react';
import ePub, { Book, Rendition } from 'epubjs';
import { Button } from './ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  BookOpen,
  Type,
  Palette,
  Menu as MenuIcon,
  X
} from 'lucide-react';
import { Card } from './ui/card';

interface EpubReaderProps {
  url: string;
  title?: string;
}

interface Theme {
  name: string;
  body: {
    background: string;
    color: string;
  };
}

const themes: Record<string, Theme> = {
  light: {
    name: 'Light',
    body: { background: '#ffffff', color: '#000000' }
  },
  sepia: {
    name: 'Sepia',
    body: { background: '#f4ecd8', color: '#5c4b37' }
  },
  dark: {
    name: 'Dark',
    body: { background: '#1a1a1a', color: '#e0e0e0' }
  },
  cyberpunk: {
    name: 'Cyberpunk',
    body: { background: '#0a0a0f', color: '#00f0ff' }
  }
};

const fontSizes = [
  { label: 'Small', value: '14px' },
  { label: 'Medium', value: '18px' },
  { label: 'Large', value: '22px' },
  { label: 'XLarge', value: '26px' }
];

export default function EpubReader({ url, title }: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [toc, setToc] = useState<any[]>([]);

  // Reader settings
  const [fontSize, setFontSize] = useState('18px');
  const [theme, setTheme] = useState<string>('sepia');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!viewerRef.current || !url) return;

    const loadBook = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Determine if we need to proxy the URL (for CORS)
        let bookInput: string | ArrayBuffer = url;
        
        if (url.startsWith('http') && !url.includes(window.location.hostname)) {
           const isProduction = process.env.NODE_ENV === 'production';
           const apiUrl = process.env.NEXT_PUBLIC_API_URL || (isProduction ? 'https://api.indexbin.com/api' : 'http://localhost:4000/api');
           const proxyUrl = `${apiUrl}/proxy?url=${encodeURIComponent(url)}`;
           
           console.log('Fetching book via proxy:', proxyUrl);
           const response = await fetch(proxyUrl);
           if (!response.ok) throw new Error(`Failed to fetch book via proxy: ${response.statusText}`);
           bookInput = await response.arrayBuffer();
        }

        // Create book
        const book = ePub(bookInput);
        bookRef.current = book;

        // Render book
        if (!viewerRef.current) {
          throw new Error('Viewer element not found');
        }

        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none'
        });
        renditionRef.current = rendition;

        // Apply initial theme
        rendition.themes.default(themes[theme].body);
        rendition.themes.fontSize(fontSize);

        await rendition.display();

        // Load table of contents
        const navigation = await book.loaded.navigation;
        setToc(navigation.toc);

        // Setup pagination
        book.ready.then(() => {
          const stored = book.locations.length();
          if (stored) {
            setTotalPages(stored);
          }
          return book.locations.generate(1600);
        }).then((locations) => {
          setTotalPages(locations.length);
          setIsLoading(false);
        });

        // Track location changes
        rendition.on('relocated', (location: any) => {
          const currentLocation = book.locations.locationFromCfi(location.start.cfi);
          setCurrentPage(currentLocation);

          const percentage = book.locations.percentageFromCfi(location.start.cfi);
          setProgress(Math.round(percentage * 100));
        });

        // Keyboard navigation
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'ArrowRight') {
            rendition.next();
          } else if (e.key === 'ArrowLeft') {
            rendition.prev();
          }
        };
        document.addEventListener('keydown', handleKeyDown);

        return () => {
          document.removeEventListener('keydown', handleKeyDown);
          rendition.destroy();
        };
      } catch (err) {
        console.error('Error loading book:', err);
        setError('Failed to load book. Please check the URL and try again.');
        setIsLoading(false);
      }
    };

    loadBook();

    return () => {
      if (renditionRef.current) {
        renditionRef.current.destroy();
      }
    };
  }, [url]);

  // Update theme
  useEffect(() => {
    if (renditionRef.current && themes[theme]) {
      renditionRef.current.themes.default(themes[theme].body);
    }
  }, [theme]);

  // Update font size
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(fontSize);
    }
  }, [fontSize]);

  const nextPage = () => {
    renditionRef.current?.next();
  };

  const prevPage = () => {
    renditionRef.current?.prev();
  };

  const goToChapter = (href: string) => {
    renditionRef.current?.display(href);
    setShowToc(false);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="p-8 max-w-md text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold mb-2">Error Loading Book</h2>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{title || 'Reading'}</h1>
            <p className="text-xs text-muted-foreground">
              {progress}% • Page {currentPage} of {totalPages}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowToc(!showToc)}
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* EPUB Viewer */}
        <div
          ref={viewerRef}
          className="absolute inset-0"
          style={{
            backgroundColor: themes[theme].body.background,
            color: themes[theme].body.color
          }}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading book...</p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {!isLoading && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/80 backdrop-blur hover:bg-card"
              onClick={prevPage}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/80 backdrop-blur hover:bg-card"
              onClick={nextPage}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>

      {/* Table of Contents Sidebar */}
      {showToc && (
        <div className="absolute top-0 left-0 h-full w-80 bg-card border-r border-border shadow-xl z-10 overflow-y-auto">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Contents
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setShowToc(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-2">
            {toc.map((chapter, index) => (
              <button
                key={index}
                onClick={() => goToChapter(chapter.href)}
                className="w-full text-left p-3 hover:bg-secondary rounded-lg transition-colors"
              >
                <p className="font-medium">{chapter.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-0 right-0 h-full w-80 bg-card border-l border-border shadow-xl z-10 overflow-y-auto">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 space-y-6">
            {/* Font Size */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Type className="h-4 w-4" />
                Font Size
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {fontSizes.map((size) => (
                  <Button
                    key={size.value}
                    variant={fontSize === size.value ? 'default' : 'outline'}
                    onClick={() => setFontSize(size.value)}
                    className="w-full"
                  >
                    {size.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Theme
              </h3>
              <div className="space-y-2">
                {Object.entries(themes).map(([key, themeData]) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      theme === key
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded border border-border"
                        style={{ backgroundColor: themeData.body.background }}
                      />
                      <span className="font-medium">{themeData.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation Bar */}
      <div className="md:hidden border-t border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={prevPage}>
            <ChevronLeft className="h-5 w-5 mr-2" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage}/{totalPages}
          </span>
          <Button variant="ghost" onClick={nextPage}>
            Next
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
