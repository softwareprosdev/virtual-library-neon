'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressRing, BookProgress } from '@/components/ProgressRing';
import BookSearch from '@/components/BookSearch';
import { GoogleBook } from '@/lib/googleBooks';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // Get personalized greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsRes, progressRes] = await Promise.all([
          api('/rooms'),
          api('/reading-progress/my').catch(() => ({ ok: false }))
        ]);

        if (roomsRes.ok) {
          const data = await roomsRes.json();
          setRooms(data.rooms || []);
        }

        if (progressRes.ok && 'json' in progressRes) {
          const data = await progressRes.json();
          setReadingProgress(data.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleBookSelect = (book: GoogleBook) => {
    console.log('Book selected:', book);
  };

  return (
    <MainLayout>
      <div className="space-y-8 pb-12">
        {/* Hero Section - Modern Minimalist */}
        <div className="relative">
          <div className="glass-card p-8 md:p-12">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                {getGreeting()}, {current User?.name || 'Reader'}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              Ready to dive into a new world?
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mb-6">
              Discover your next great read, join live reading circles, or continue where you left off.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl">
              <BookSearch onSelectBook={handleBookSelect} />
            </div>
          </div>
        </div>

        {/* Reading Progress Carousel */}
        {readingProgress.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Continue Reading</h2>
              <Button variant="ghost" size="sm" className="text-primary">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {readingProgress.map((progress) => (
                <button
                  key={progress.id}
                  onClick={() => router.push(`/books/${progress.book.id}`)}
                  className="glass-card p-4 text-left hover:scale-105 transition-all duration-300"
                >
                  <div className="flex justify-center mb-3">
                    <BookProgress
                      currentPage={progress.currentPage}
                      totalPages={progress.totalPages}
                      coverUrl={progress.book.coverUrl}
                      title={progress.book.title}
                      size={100}
                    />
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                    {progress.book.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {progress.currentPage} of {progress.totalPages} pages
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Books Read */}
          <Card className="glass-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Books This Year</p>
                  <p className="text-3xl font-bold">12</p>
                  <p className="text-xs text-primary mt-1">+3 from last month</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reading Streak */}
          <Card className="glass-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Day Streak</p>
                  <p className="text-3xl font-bold">23</p>
                  <p className="text-xs text-orange-500 mt-1">Keep it up!</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Level */}
          <Card className="glass-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reader Level</p>
                  <p className="text-3xl font-bold">12</p>
                  <p className="text-xs text-purple-500 mt-1">Book Enthusiast</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Reading Rooms */}
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
                  className="glass-card border-0 cursor-pointer card-hover"
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

        {/* All Reading Rooms */}
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
