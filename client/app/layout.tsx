import { ReactNode } from 'react';
import "./globals.css";
import { cn } from "../lib/utils";

export const metadata = {
  title: "IndexBin - The Ultimate Book Community",
  description: "Read, discuss, and share books with a global community. Live video rooms, EPUB reader, and social features.",
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={cn("min-h-screen bg-background font-sans antialiased text-foreground")}>
        {children}
      </body>
    </html>
  );
}
