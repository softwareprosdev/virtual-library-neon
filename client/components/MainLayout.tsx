'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Compass, 
  Plus, 
  Library, 
  UserCircle, 
  LogOut, 
  Zap, 
  Users,
  MessageSquare,
  Play,
  ShoppingBag,
  Settings
} from 'lucide-react';
import { cn } from '../lib/utils';
import { logout, getUser } from '../lib/auth';
import NotificationCenter from './NotificationCenter';

interface MainLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
  hideNav?: boolean;
}

// Bottom nav items (mobile) - 5 items max for thumb reach
const mobileNavItems = [
  { text: 'Home', path: '/feed', icon: Home },
  { text: 'Explore', path: '/explore', icon: Compass },
  { text: 'Create', path: null, icon: Plus, isAction: true }, // FAB trigger
  { text: 'Library', path: '/library', icon: Library },
  { text: 'Profile', path: '/profile', icon: UserCircle, isDynamic: true },
];

// Full sidebar items (desktop)
const desktopNavItems = [
  { text: 'Home', path: '/feed', icon: Home },
  { text: 'Videos', path: '/videos', icon: Play },
  { text: 'Explore', path: '/explore', icon: Compass },
  { text: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
  { text: 'Messages', path: '/messages', icon: MessageSquare },
  { text: 'Community', path: '/community', icon: Users },
  { text: 'My Library', path: '/library', icon: Library },
  { text: 'Profile', path: '/profile', icon: UserCircle, isDynamic: true },
  { text: 'Settings', path: '/settings', icon: Settings },
];

export default function MainLayout({ children, fullWidth = false, hideNav = false }: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (user) setUserId(user.id);
  }, []);

  const getPath = (item: typeof mobileNavItems[0]) => {
    if (item.isDynamic && userId) {
      return `/profile/${userId}`;
    }
    return item.path || '/feed';
  };

  const handleNavClick = (item: typeof mobileNavItems[0]) => {
    if (item.isAction) {
      setShowCreateMenu(true);
    } else {
      router.push(getPath(item));
    }
  };

  const isActive = (path: string | null) => {
    if (!path) return false;
    if (path === '/profile' && pathname?.startsWith('/profile')) return true;
    return pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background font-sans text-foreground">
      
      {/* ===== DESKTOP SIDEBAR (768px+) ===== */}
      {!hideNav && (
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 w-64 flex-col glass-card rounded-none border-x-0 border-y-0 bg-card/40">
          {/* Logo */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl gradient-text tracking-wide">IndexBin</h1>
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Virtual Library</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              const path = item.isDynamic && userId ? `/profile/${userId}` : item.path;
              const active = isActive(path);
              
              return (
                <button
                  key={item.text}
                  onClick={() => router.push(path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all rounded-xl group",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <Icon size={20} className={cn("transition-colors", active && "text-primary")} />
                  <span>{item.text}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Online</span>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      {/* ===== MOBILE HEADER ===== */}
      {!hideNav && (
        <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-background/80 backdrop-blur-xl border-b border-white/5 safe-top">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg gradient-text">IndexBin</span>
          </div>
          <NotificationCenter />
        </header>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main className={cn(
        "flex-1 overflow-y-auto",
        !hideNav && "md:ml-64", // Offset for desktop sidebar
        !hideNav && "pt-14 md:pt-0", // Offset for mobile header
        !hideNav && "has-bottom-nav md:pb-0", // Offset for mobile bottom nav
        fullWidth ? "" : "p-4 md:p-6"
      )}>
        <div className={fullWidth ? "w-full" : "max-w-4xl mx-auto"}>
          {children}
        </div>
      </main>

      {/* ===== MOBILE BOTTOM NAVIGATION ===== */}
      {!hideNav && (
        <nav className="md:hidden bottom-nav flex items-center justify-around">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.isDynamic && userId ? `/profile/${userId}` : item.path);
            
            // Center "Create" button styling
            if (item.isAction) {
              return (
                <button
                  key={item.text}
                  onClick={() => handleNavClick(item)}
                  className="flex items-center justify-center w-12 h-12 rounded-full gradient-primary glow-primary -mt-4"
                  aria-label="Create"
                >
                  <Plus className="w-6 h-6 text-white" />
                </button>
              );
            }
            
            return (
              <button
                key={item.text}
                onClick={() => handleNavClick(item)}
                className={cn("bottom-nav-item", active && "active")}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span>{item.text}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* ===== CREATE MENU (Mobile Action Sheet) ===== */}
      <AnimatePresence>
        {showCreateMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] md:hidden"
              onClick={() => setShowCreateMenu(false)}
            />
            
            {/* Action Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[201] bg-card rounded-t-3xl p-6 safe-bottom md:hidden"
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <h3 className="text-lg font-bold mb-4">Create</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowCreateMenu(false);
                    router.push('/feed');
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors touch-target-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">New Post</p>
                    <p className="text-xs text-muted-foreground">Share with the community</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowCreateMenu(false);
                    router.push('/community');
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors touch-target-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Start Reading Room</p>
                    <p className="text-xs text-muted-foreground">Read together live</p>
                  </div>
                </button>
              </div>
              <button
                onClick={() => setShowCreateMenu(false)}
                className="w-full mt-4 p-4 rounded-xl border border-white/10 text-muted-foreground hover:text-foreground transition-colors touch-target-lg"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
