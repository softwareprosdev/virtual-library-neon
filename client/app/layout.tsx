import { ReactNode } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../lib/theme';
import "./globals.css";

export const metadata = {
  title: "Virtual Library | Real-time Collaborative Study Rooms",
  description: "Join the future of studying with Virtual Library. Real-time chat, video conferencing, and shared reading spaces in a neon-drenched cyberpunk environment.",
  keywords: ["virtual library", "study group", "real-time chat", "video conference", "collaborative reading", "cyberpunk", "neon"],
  openGraph: {
    title: "Virtual Library | Collaborative Study Rooms",
    description: "Real-time study rooms with chat and video.",
    type: "website",
    locale: "en_US",
    siteName: "Virtual Library",
  },
  twitter: {
    card: "summary_large_image",
    title: "Virtual Library",
    description: "Connect, study, and collaborate in real-time.",
  },
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}