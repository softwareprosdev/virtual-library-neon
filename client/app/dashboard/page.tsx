'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressRing, BookProgress } from '@/components/ProgressRing';
import BookSearch from '@/components/BookSearch';
import { GoogleBook } from '@/lib/googleBooks';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { GradientText } from '@/components/ui/GradientText';
import { StoryCircle } from '@/components/StoryCircle';
import { BookCarousel, BookCarouselItem } from '@/components/BookCarousel';
import {
  BookOpen,
  Sparkles,
  Trophy,
  Users,
  ChevronRight,
  Flame,
  Target,
  Award,
  Play,
  TrendingUp,
  Star,
  Clock
} from 'lucide-react';

interface Room {
  id: string;
  name: string;
  description?: string;
  isLive: boolean;
  _count?: {
    participants: number;
  };
}

interface ReadingProgress {
  id: string;
  currentPage: number;
  totalPages: number;
  percentComplete: number;
  lastReadAt: string;
  book: {
    id: string;
    title: string;
    author?: string;
    coverUrl?: string;
  };
}

// Animation variants for staggered entrance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function DashboardPage() {
  const router = useRouter();
  const currentUser = getUser();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await api('/rooms');
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    }
  });

  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['reading-progress'],
    queryFn: async () => {
      const res = await api('/reading-progress/my');
      if (!res.ok) return [];
      return res.json();
    }
  });

  const rooms = (roomsData?.rooms || []) as Room[];
  const readingProgress = (Array.isArray(progressData) ? progressData.slice(0, 5) : []) as ReadingProgress[];
  const liveRooms = rooms.filter(r => r.isLive);
  const loading = roomsLoading || progressLoading;

  const handleBookSelect = (book: GoogleBook) => {
    console.log('Book selected:', book);
  };

  return (
    <MainLayout>
      <motion.div 
        className="space-y-6 md:space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* === HERO SECTION - Mobile Optimized === */}
        <motion.section variants={itemVariants} className="relative">
          <div className="glass-card p-5 md:p-8 overflow-hidden">
            {/* Gradient orb background */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent/20 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {getGreeting()}
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold mb-2">
                <GradientText variant="primary" as="span" animated>
                  {currentUser?.name || 'Reader'}
                </GradientText>
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                What will you read today?
              </p>
              
              {/* Search - Full width on mobile */}
              <div className="max-w-xl">
                <BookSearch onBookSelect={handleBookSelect} />
              </div>
            </div>
          </div>
        </motion.section>

        {/* === LIVE STORIES (Instagram-style circles) === */}
        {liveRooms.length > 0 && (
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-sm font-bold uppercase tracking-wide">Live Now</h2>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                See All <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {liveRooms.slice(0, 10).map((room) => (
                <StoryCircle
                  key={room.id}
                  label={room.name}
                  unread={true}
                  onClick={() => router.push(`/room/${room.id}`)}
                  size={72}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* === CONTINUE READING - Premium Cards === */}
        {readingProgress.length > 0 && (
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Continue Reading
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {readingProgress.map((progress) => (
                <motion.div
                  key={progress.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(`/books/${progress.book.id}`)}
                  className="flex-shrink-0 w-36 md:w-44 snap-start cursor-pointer"
                >
                  <div className="relative mb-2">
                    <BookProgress
                      currentPage={progress.currentPage}
                      totalPages={progress.totalPages}
                      coverUrl={progress.book.coverUrl}
                      title={progress.book.title}
                      size={120}
                    />
                  </div>
                  <h3 className="font-semibold text-xs line-clamp-2 text-center px-1">
                    {progress.book.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground text-center mt-0.5">
                    {Math.round(progress.percentComplete)}% complete
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* === QUICK STATS - Horizontal Scroll === */}
        <motion.section variants={itemVariants}>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {[
              { icon: BookOpen, label: 'Books', value: '12', color: 'text-primary', bg: 'bg-primary/10' },
              { icon: Flame, label: 'Streak', value: '23d', color: 'text-orange-500', bg: 'bg-orange-500/10' },
              { icon: Trophy, label: 'Level', value: '12', color: 'text-purple-500', bg: 'bg-purple-500/10' },
              { icon: Star, label: 'Reviews', value: '47', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="flex-shrink-0 w-24 glass-card p-3 snap-start"
              >
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* === LIVE READING ROOMS - Premium Cards === */}
        {liveRooms.length > 0 && (
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                <Play className="w-4 h-4 text-red-500" />
                Reading Circles
              </h2>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View All <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {liveRooms.slice(0, 3).map((room) => (
                <motion.div
                  key={room.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => router.push(`/room/${room.id}`)}
                  className="glass-card p-4 cursor-pointer border-l-2 border-l-primary"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="destructive" className="bg-red-500/90 text-[10px] px-1.5 py-0">
                          LIVE
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {room._count?.participants || 0}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm line-clamp-1">{room.name}</h3>
                      {room.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{room.description}</p>
                      )}
                    </div>
                    <Button size="sm" className="ml-3 h-8 text-xs touch-target">
                      Join
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* === CURATED FOR YOU - Coming Soon === */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Target className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold uppercase tracking-wide">For You</h2>
          </div>
          <div className="glass-card p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-3">
              <Award className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              AI recommendations coming soon
            </p>
            <p className="text-xs text-muted-foreground/60">
              Based on your reading history
            </p>
          </div>
        </motion.section>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}
      </motion.div>
    </MainLayout>
  );
}
