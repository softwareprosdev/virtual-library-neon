'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Library, LogOut, Menu, X, Bookmark, Compass, Users, Zap, ChevronRight, UserCircle, BookOpen, MessageSquare, Home, ShoppingBag, Play } from 'lucide-react';
import { cn } from '../lib/utils';
import { logout, getUser } from '../lib/auth';
import NotificationCenter from './NotificationCenter';

interface MainLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
  hideNav?: boolean;
}

export default function MainLayout({ children, fullWidth = false, hideNav = false }: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user ID for profile link
  useEffect(() => {
    const user = getUser();
    if (user) setUserId(user.id);
  }, []);

  const menuItems = [
    { text: 'Home', path: '/feed', icon: Home },
    { text: 'Videos', path: '/videos', icon: Play },
    { text: 'Explore', path: '/explore', icon: Compass },
    { text: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
    { text: 'Messages', path: '/messages', icon: MessageSquare },
    { text: 'Community', path: '/community', icon: Users },
    { text: 'My Library', path: '/library', icon: Library },
    { text: 'Profile', path: userId ? `/profile/${userId}` : '/feed', icon: UserCircle },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background font-sans text-foreground">
      {/* Mobile Header - Glassmorphic */}
      {!hideNav && (
      <header className="md:hidden flex items-center justify-between p-4 pt-[calc(1rem+env(safe-area-inset-top))] glass-card rounded-none border-x-0 border-t-0 bg-card/80 backdrop-blur-xl relative z-50">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-bold text-xl gradient-text uppercase tracking-widest">IndexBin</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button
            onClick={toggleMobileMenu}
            className="p-2 text-primary hover:text-accent transition-colors"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Desktop & Mobile) - Glassmorphic & Modern */}
      {!hideNav && (
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-68 glass border-r-0 transform transition-all duration-300 ease-in-out md:relative md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col glass-card rounded-none border-x-0 border-y-0 bg-card/40">
          {/* Logo Section */}
          <div className="p-8 border-b border-white/5 hidden md:block">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="font-bold text-2xl gradient-text uppercase tracking-wider">IndexBin</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Neural Archive</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-6 px-3 opacity-50 font-bold">
              Explore
            </div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    router.push(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-3 text-sm font-medium transition-all rounded-xl group relative overflow-hidden",
                    isActive
                      ? "bg-primary/10 text-primary glow-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <Icon size={20} className={cn("transition-colors", isActive ? "text-primary" : "group-hover:text-primary")} />
                  <span className="tracking-wide">{item.text}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeNav"
                      className="absolute right-0 w-1 h-6 gradient-primary rounded-l-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* System Status - Mini stats area */}
          <div className="px-6 py-6 border-t border-white/5 bg-black/20">
            <div className="flex items-center justify-between mb-4">
               <div className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50 font-bold">
                Connection
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                <span className="text-emerald-500 font-bold uppercase tracking-tighter">Secure</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 glass-card p-3 rounded-xl border-white/5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Users size={14} className="text-accent" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-foreground">624 Readers</p>
                <p className="text-[8px] text-muted-foreground uppercase">Sync Active</p>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="p-6 border-t border-white/5">
            <button
              onClick={logout}
              className="w-full flex items-center gap-4 px-4 py-4 text-sm font-bold text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all group"
            >
              <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
              <span className="tracking-wide">Disconnect</span>
            </button>
          </div>
        </div>
      </aside>
      )}

      {/* Mobile Menu Overlay with better blur */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-xl transition-all duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-y-auto relative",
        hideNav ? "h-screen" : "h-[calc(100dvh-64px)] md:h-screen",
        fullWidth ? "" : "p-4 md:p-8"
      )}>
        {/* Top accent line */}
        {!fullWidth && (
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00f0ff]/30 to-transparent" />
        )}

        <div className={fullWidth ? "w-full" : "max-w-7xl mx-auto"}>
          {children}
        </div>
      </main>
    </div>
  );
}
