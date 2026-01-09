'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Library, LogOut, Menu, X, Bookmark, Compass, Users, Zap, ChevronRight, UserCircle, BookOpen, MessageSquare, Home } from 'lucide-react';
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
    { text: 'Feed', path: '/feed', icon: Home },
    { text: 'Messages', path: '/messages', icon: MessageSquare },
    { text: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { text: 'Free Books', path: '/free-books', icon: BookOpen },
    { text: 'Browse', path: '/browse', icon: Compass },
    { text: 'Community', path: '/community', icon: Users },
    { text: 'Reading Log', path: '/reading-list', icon: Bookmark },
    { text: 'My Uploads', path: '/library', icon: Library },
    { text: 'Profile', path: userId ? `/profile/${userId}` : '/dashboard', icon: UserCircle },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      {!hideNav && (
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card relative">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#fcee0a] to-transparent" />
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#fcee0a]" style={{ filter: 'drop-shadow(0 0 5px #fcee0a)' }} />
          <span className="font-bold text-xl text-[#fcee0a] uppercase tracking-wider">IndexBin</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button
            onClick={toggleMobileMenu}
            className="p-3 text-[#00f0ff] hover:text-[#fcee0a] border border-border hover:border-[#fcee0a] transition-colors rounded-md"
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
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Desktop & Mobile) */}
      {!hideNav && (
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar accent line */}
        <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-[#fcee0a] via-[#00f0ff] to-[#ff00a0]" />

        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-border hidden md:block relative">
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#fcee0a] to-transparent" />
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-[#fcee0a]" style={{ filter: 'drop-shadow(0 0 8px #fcee0a)' }} />
              <div className="flex-1">
                <h1 className="font-bold text-2xl text-[#fcee0a] uppercase tracking-wider">IndexBin</h1>
                <p className="text-[10px] text-[#00f0ff] uppercase tracking-[0.2em]">Neural Archive</p>
              </div>
              <div className="hidden md:block">
                <NotificationCenter />
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3 px-2">
              {`// Navigation`}
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
                    "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all group relative",
                    isActive
                      ? "bg-[#fcee0a]/10 text-[#fcee0a] border-l-2 border-[#fcee0a]"
                      : "text-muted-foreground hover:text-[#00f0ff] hover:bg-[#00f0ff]/5 border-l-2 border-transparent hover:border-[#00f0ff]/50"
                  )}
                >
                  <Icon size={18} className={isActive ? "text-[#fcee0a]" : "group-hover:text-[#00f0ff]"} />
                  <span className="uppercase tracking-wider text-xs">{item.text}</span>
                  {isActive && (
                    <ChevronRight size={14} className="ml-auto text-[#fcee0a]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* System Status */}
          <div className="px-4 py-3 border-t border-border">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
              {`// System Status`}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse" />
              <span className="text-[#00f0ff]">Connected</span>
            </div>
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-border">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#ff003c] hover:bg-[#ff003c]/10 border border-transparent hover:border-[#ff003c]/30 transition-all group"
            >
              <LogOut size={18} />
              <span className="uppercase tracking-wider text-xs">Disconnect</span>
            </button>
          </div>
        </div>
      </aside>
      )}

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
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
