'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ChevronRight
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

        if (progressRes.ok) {
          const data = await progressRes.json();
          setReadingProgress(data.slice(0, 3)); // Show top 3
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
    // TODO: Add book to reading list or create reading circle
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 p-8 border border-primary/30">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary tracking-wider">WELCOME BACK</span>
            </div>
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Discover Your Next Great Read
            </h1>
            <p className="text-muted-foreground max-w-2xl mb-6">
              Join reading circles, track your progress, and connect with fellow book lovers in our virtual library.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => router.push('/rooms')} size="lg" className="group">
                <Users className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                Browse Reading Circles
              </Button>
              <Button onClick={() => router.push('/marketplace')} variant="outline" size="lg">
                <BookOpen className="w-4 h-4 mr-2" />
                Marketplace
              </Button>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-0" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl -z-0" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs">This Week</Badge>
              </div>
              <h3 className="text-2xl font-bold mb-1">{readingProgress.length}</h3>
              <p className="text-sm text-muted-foreground">Books in Progress</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Trophy className="w-5 h-5 text-emerald-500" />
                </div>
                <Badge variant="outline" className="text-xs">All Time</Badge>
              </div>
              <h3 className="text-2xl font-bold mb-1">0</h3>
              <p className="text-sm text-muted-foreground">Books Completed</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Users className="w-5 h-5 text-amber-500" />
                </div>
                <Badge variant="outline" className="text-xs">Active</Badge>
              </div>
              <h3 className="text-2xl font-bold mb-1">{rooms.filter(r => r.isLive).length}</h3>
              <p className="text-sm text-muted-foreground">Live Reading Circles</p>
            </CardContent>
          </Card>
        </div>

        {/* Currently Reading */}
        {readingProgress.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold">Continue Reading</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/reading-list')}>
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {readingProgress.map((progress) => (
                <Card key={progress.id} className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden border-primary/20">
                  <div className="aspect-[3/4] relative bg-secondary/30">
                    {progress.book.coverUrl ? (
                      <Image
                        src={progress.book.coverUrl}
                        alt={progress.book.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <BookOpen className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Progress Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <div className="w-full bg-secondary/30 rounded-full h-2 mb-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${progress.percentComplete}%` }}
                        />
                      </div>
                      <p className="text-xs text-white/90 font-medium">
                        {Math.round(progress.percentComplete)}% Complete
                      </p>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                      {progress.book.title}
                    </h3>
                    {progress.book.author && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {progress.book.author}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Live Reading Circles */}
        {rooms.filter(r => r.isLive).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold">Live Now</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/rooms')}>
                See All Circles
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.filter(r => r.isLive).slice(0, 6).map((room) => (
                <Card
                  key={room.id}
                  className="group cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all"
                  onClick={() => router.push(`/room/${room.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-medium text-emerald-500">LIVE</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {room._count?.participants || 0}
                      </Badge>
                    </div>

                    <h3 className="font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {room.name}
                    </h3>

                    {room.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {room.description}
                      </p>
                    )}

                    <Button variant="ghost" size="sm" className="w-full mt-4 group-hover:bg-primary/10">
                      Join Circle
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Book Discovery */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold">Discover Books</h2>
          </div>

          <BookSearch
            onBookSelect={handleBookSelect}
            placeholder="Search millions of books..."
            showAllResults={true}
          />
        </div>
      </div>
    </MainLayout>
  );
}
