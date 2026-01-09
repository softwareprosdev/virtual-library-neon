'use client';

// Polyfill DOMMatrix for environments where it's missing (like some SSR contexts or older browsers)
import 'dommatrix/dist/dommatrix.js';

import { useState, forwardRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import the PDF reader to avoid SSR issues
const PDFReader = dynamic(() => import('./PDFReader'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-2 text-primary font-medium">Loading PDF Viewer...</p>
    </div>
  )
});

interface BookReaderProps {
  url: string;
}

export default function BookReader3D({ url }: BookReaderProps) {
  return <PDFReader url={url} />;
}
