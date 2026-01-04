'use client';

// Polyfill DOMMatrix for environments where it's missing (like some SSR contexts or older browsers)
import 'dommatrix/dist/dommatrix.js';

import { useState, forwardRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';

// Configure PDF worker to load from CDN to avoid build issues
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface BookReaderProps {
  url: string;
}

// Custom Page component for FlipBook to wrap PDF Page
const PDFPage = forwardRef<HTMLDivElement, { pageNumber: number }>((props, ref) => {
  return (
    <div ref={ref} className="bg-white overflow-hidden shadow-sm">
       <Page 
         pageNumber={props.pageNumber} 
         width={450} 
         renderAnnotationLayer={false} 
         renderTextLayer={false} 
         error={<div className="p-5 text-destructive">Error loading page</div>}
       />
       <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
         {props.pageNumber}
       </div>
    </div>
  );
});
PDFPage.displayName = 'PDFPage';

const Cover = forwardRef<HTMLDivElement, { children: React.ReactNode }>((props, ref) => {
    return (
        <div ref={ref} className="bg-secondary/50 text-primary flex items-center justify-center border-2 border-primary/20 h-full">
            {props.children}
        </div>
    )
})
Cover.displayName = 'Cover';

export default function BookReader3D({ url }: BookReaderProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center min-h-[80vh] bg-background p-4">
      
      {/* Hidden Document Loader */}
      {loading && (
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-primary font-medium">Loading Book...</p>
        </div>
      )}

      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={null}
        error={<p className="text-destructive font-medium">Failed to load book file.</p>}
      >
        {numPages > 0 && (
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - react-pageflip types can be finicky
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
                    <PDFPage key={`page_${index + 1}`} pageNumber={index + 1} />
                ))}

                <Cover>
                    <p className="font-mono">END</p>
                </Cover>
            </HTMLFlipBook>
        )}
      </Document>
    </div>
  );
}
