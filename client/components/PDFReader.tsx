'use client';

import { useState, forwardRef, lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load heavy PDF components
const HTMLFlipBook = lazy(() => import('react-pageflip'));
const PDFDocument = lazy(() => import('react-pdf').then(module => ({ default: module.Document })));
const PDFPage = lazy(() => import('react-pdf').then(module => ({ default: module.Page })));
const pdfjs = await import('react-pdf').then(module => module.pdfjs);

// Configure PDF worker to load from CDN to avoid Node.js canvas dependency
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

interface PDFReaderProps {
  url: string;
}

// Custom Page component for FlipBook to wrap PDF Page
const PDFPageComponent = forwardRef<HTMLDivElement, { pageNumber: number }>((props, ref) => {
  return (
    <div ref={ref} className="bg-white overflow-hidden shadow-sm">
       <Suspense fallback={<div className="p-5 text-muted-foreground">Loading page...</div>}>
         <PDFPage 
           pageNumber={props.pageNumber} 
           width={450} 
           renderAnnotationLayer={false} 
           renderTextLayer={false} 
           error={<div className="p-5 text-destructive">Error loading page</div>}
         />
       </Suspense>
       <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
         {props.pageNumber}
       </div>
    </div>
  );
});
PDFPageComponent.displayName = 'PDFPageComponent';

const Cover = forwardRef<HTMLDivElement, { children: React.ReactNode }>((props, ref) => {
    return (
        <div ref={ref} className="bg-secondary/50 text-primary flex items-center justify-center border-2 border-primary/20 h-full">
            {props.children}
        </div>
    )
})
Cover.displayName = 'Cover';

export default function PDFReader({ url }: PDFReaderProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    setError(`Failed to load PDF: ${error.message}`);
    setLoading(false);
  }

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setError(null);
      setLoading(true);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-[80vh] bg-background p-4">
      
      {/* Hidden Document Loader */}
      {loading && (
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-primary font-medium">Loading Book... (Attempt {retryCount + 1})</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-destructive font-medium mb-4">{error}</div>
          {retryCount < 3 && (
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Retry ({3 - retryCount} attempts left)
            </button>
          )}
          {retryCount >= 3 && (
            <div className="text-muted-foreground mt-2">
              Maximum retry attempts reached. Please check your connection and try again later.
            </div>
          )}
        </div>
      )}

      {!error && (
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-primary font-medium">Loading Document...</p>
          </div>
        }>
          <PDFDocument
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            error={null}
          >
            {numPages > 0 && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }>
                  <HTMLFlipBook
                      width={450}
                      height={650}
                      size="fixed"
                      minWidth={300}
                      maxWidth={1000}
                      minHeight={400}
                      maxHeight={1533}
                      maxShadowOpacity={0.5}
                      showCover={true}
                      mobileScrollSupport={true}
                      className="flip-book shadow-2xl"
                      style={{ margin: '0 auto' }}
                      startPage={0}
                      drawShadow={true}
                      flippingTime={1000}
                      usePortrait={true}
                      startZIndex={0}
                      autoSize={true}
                      clickEventForward={true}
                      useMouseEvents={true}
                      swipeDistance={30}
                      showPageCorners={true}
                      disableFlipByClick={false}
                  >
                      <Cover>
                          <div className="text-center">
                              <h1 className="text-2xl font-mono font-bold">V-LIBRARY</h1>
                              <p className="text-sm tracking-widest mt-2">ARCHIVE</p>
                          </div>
                      </Cover>

                      {Array.from(new Array(numPages), (_, index) => (
                          <PDFPageComponent key={`page_${index + 1}`} pageNumber={index + 1} />
                      ))}

                      <Cover>
                          <p className="font-mono">END</p>
                      </Cover>
                  </HTMLFlipBook>
                </Suspense>
            )}
          </PDFDocument>
        </Suspense>
      )}
    </div>
  );
}