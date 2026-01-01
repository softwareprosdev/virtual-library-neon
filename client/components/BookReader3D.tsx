'use client';

import { useState, useRef, forwardRef, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { Document, Page, pdfjs } from 'react-pdf';
import { Box, CircularProgress, Typography } from '@mui/material';

// Configure PDF worker to load from CDN to avoid build issues
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface BookReaderProps {
  url: string;
}

// Custom Page component for FlipBook to wrap PDF Page
const PDFPage = forwardRef<HTMLDivElement, { pageNumber: number }>((props, ref) => {
  return (
    <div ref={ref} style={{ backgroundColor: 'white', overflow: 'hidden' }}>
       <Page 
         pageNumber={props.pageNumber} 
         width={450} 
         renderAnnotationLayer={false} 
         renderTextLayer={false} 
         error={<div style={{padding: 20}}>Error loading page</div>}
       />
       <div style={{ position: 'absolute', bottom: 10, right: 10, color: '#333', fontSize: 12 }}>
         {props.pageNumber}
       </div>
    </div>
  );
});
PDFPage.displayName = 'PDFPage';

const Cover = forwardRef<HTMLDivElement, { children: React.ReactNode }>((props, ref) => {
    return (
        <div ref={ref} style={{ backgroundColor: '#1a1a1a', color: '#00ff41', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #00ff41' }}>
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
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '80vh', bgcolor: '#000', p: 4 }}>
      
      {/* Hidden Document Loader */}
      <Box sx={{ display: loading ? 'block' : 'none' }}>
        <CircularProgress color="secondary" />
        <Typography sx={{ mt: 2, color: 'secondary.main' }}>Loading Neural Archive...</Typography>
      </Box>

      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={null}
        error={<Typography color="error">Failed to load archive module.</Typography>}
      >
        {numPages > 0 && (
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
                className="flip-book"
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
                    <div style={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontFamily: 'monospace' }}>NEURAL ARCHIVE</Typography>
                        <Typography variant="caption">CONFIDENTIAL</Typography>
                    </div>
                </Cover>

                {Array.from(new Array(numPages), (el, index) => (
                    <PDFPage key={`page_${index + 1}`} pageNumber={index + 1} />
                ))}

                <Cover>
                    <Typography>END OF TRANSMISSION</Typography>
                </Cover>
            </HTMLFlipBook>
        )}
      </Document>
    </Box>
  );
}
