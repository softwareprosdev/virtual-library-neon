'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
import { StatsCard } from '@/components/ui/StatsCard';
import { StoryCircle } from '@/components/StoryCircle';
import { BookCarousel, BookCarouselItem } from '@/components/BookCarousel';
import {
  BookOpen,
  TrendingUp,
  Sparkles,
  Clock,
  Trophy,
  Users,
  MessageCircle,
  ChevronRight,
  Flame,
  Target,
  Award
} from 'lucide-react';
import Image from 'next/image';

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

export default function DashboardPage() {
  const router = useRouter();
  const currentUser = getUser();
  
  // Get personalized greeting
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
      if (!res.ok) {
         // Return empty array/object gracefully if this fails (e.g. 404 or auth issue)
         return []; 
      }
      return res.json();
    }
  });

  const rooms = (roomsData?.rooms || []) as Room[];
  // The API returns an array directly according to previous code: `setReadingProgress(data.slice(0, 5))`
  const readingProgress = (Array.isArray(progressData) ? progressData.slice(0, 5) : []) as ReadingProgress[];
  
  const loading = roomsLoading || progressLoading;

  const handleBookSelect = (book: GoogleBook) => {
    console.log('Book selected:', book);
  };

  return (
    <MainLayout>
      <div className="space-y-8 pb-12">
        {/* Hero Section - Modern Minimalist with Gradient */}
        <div className="relative">
          <div className="glass-card p-8 md:p-12">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                {getGreeting()}, {currentUser?.name || 'Reader'}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <GradientText variant="primary" as="span" animated>
                Ready to dive into a new world?
              </GradientText>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mb-6">
              Discover your next great read, join live reading circles, or continue where you left off.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl">
              <BookSearch onBookSelect={handleBookSelect} />
            </div>
          </div>
        </div>

        {/* Continue Reading Carousel */}
        {readingProgress.length > 0 && (
          <BookCarousel title="Continue Reading" showViewAll={readingProgress.length > 5}>
            {readingProgress.map((progress) => (
              <BookCarouselItem
                key={progress.id}
                onClick={() => router.push(`/books/${progress.book.id}`)}
                className="w-[200px]"
              >
                <div className="flex flex-col items-center">
                  <BookProgress
                    currentPage={progress.currentPage}
                    totalPages={progress.totalPages}
                    coverUrl={progress.book.coverUrl}
                    title={progress.book.title}
                    size={140}
                  />
                  <h3 className="font-semibold text-sm line-clamp-2 text-center mt-3 px-2">
                    {progress.book.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {progress.currentPage} of {progress.totalPages} pages
                  </p>
                </div>
              </BookCarouselItem>
            ))}
          </BookCarousel>
        )}


        {/* Stats Cards - Enhanced with Animation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            icon={BookOpen}
            label="Books This Year"
            value={12}
            trend="+3 from last month"
            iconColor="text-primary"
            iconBgColor="bg-primary/10"
            delay={0}
          />
          <StatsCard
            icon={Flame}
            label="Day Streak"
            value={23}
            trend="Keep it up!"
            iconColor="text-orange-500"
            iconBgColor="bg-orange-500/10"
            delay={0.1}
          />
          <StatsCard
            icon={Trophy}
            label="Reader Level"
            value={12}
            trend="Book Enthusiast"
            iconColor="text-purple-500"
            iconBgColor="bg-purple-500/10"
            delay={0.2}
          />
        </div>

        {/* Reading Circle Stories Preview*/}
        {rooms.filter(r => r.isLive).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-semibold">📸 Reading Circle Stories</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {rooms.filter(r => r.isLive).slice(0, 8).map((room) => (
                <StoryCircle
                  key={room.id}
                  label={room.name}
                  unread={true}
                  onClick={() => router.push(`/room/${room.id}`)}
                  size={80}
                />
              ))}
            </div>
          </div>
        )}


        {/* Live Reading Rooms - Enhanced */}
        {rooms.filter(r => r.isLive).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <h2 className="text-2xl font-bold">Live Reading Circles</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.filter(r => r.isLive).slice(0, 3).map((room) => (
                <Card
                  key={room.id}
                  className="glass-card border-0 cursor-pointer card-hover glow-primary"
                  onClick={() => router.push(`/room/${room.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="destructive" className="bg-red-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-white mr-1.5"></div>
                        LIVE
                      </Badge>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-1" />
                        {room._count?.participants || 0}
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{room.name}</h3>
                    {room.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {room.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Personalized For You Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-accent" />
            <h2 className="text-2xl font-bold">Curated For You</h2>
          </div>
          
          <div className="glass-card p-8 text-center">
            <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              AI-powered book recommendations coming soon
            </p>
            <p className="text-sm text-muted-foreground">
              Based on your reading history and preferences
            </p>
          </div>
        </div>

        {/* All Reading Rooms - Enhanced */}
        {rooms.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">All Reading Circles</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.slice(0, 6).map((room) => (
                <Card
                  key={room.id}
                  className="glass-card border-0 cursor-pointer card-hover"
                  onClick={() => router.push(`/room/${room.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      {room.isLive ? (
                        <Badge variant="destructive" className="bg-red-500">
                          <div className="w-1.5 h-1.5 rounded-full bg-white mr-1.5"></div>
                          LIVE
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Available</Badge>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-1" />
                        {room._count?.participants || 0}
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{room.name}</h3>
                    {room.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {room.description}
                      </p>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/room/${room.id}`);
                      }}
                    >
                      {room.isLive ? 'Join Now' : 'Enter Room'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="shimmer w-12 h-12 rounded-full"></div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
