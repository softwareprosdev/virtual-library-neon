'use client';

import { useState } from 'react';
import React from 'react';
import MainLayout from '@/components/MainLayout';
import NewsFeed from '@/components/NewsFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  BookmarkIcon,
  RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState('following');
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const refreshFeed = () => {
    // Trigger a re-render of the NewsFeed component
    window.location.reload();
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="w-8 h-8" />
              Feed
            </h1>
            <p className="text-muted-foreground mt-1">
              Stay updated with the latest from the community
            </p>
          </div>
          
          <Button variant="outline" onClick={refreshFeed}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Feed Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="following" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Following
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="following" className="mt-6">
            {currentUserId ? (
              <NewsFeed userId={currentUserId} />
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Sign in to see your feed</h3>
                  <p className="text-muted-foreground mb-4">
                    Follow users to see their latest updates and activities
                  </p>
                  <Button>Sign In</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="trending" className="mt-6">
            <div className="space-y-6">
              {/* Trending Books */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Trending Books
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendingBooks />
                </CardContent>
              </Card>

              {/* Popular Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Popular Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PopularUsers />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

// Component for trending books
function TrendingBooks() {
  const [trendingBooks, setTrendingBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchTrendingBooks = async () => {
      try {
        // For now, get most liked books
        const response = await api('/book-posts?sort=likes&limit=5');
        if (response.ok) {
          const books = await response.json();
          setTrendingBooks(books);
        }
      } catch (error) {
        console.error('Error fetching trending books:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingBooks();
  }, []);

  if (loading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => (
      <div key={i} className="animate-pulse flex items-center gap-3">
        <div className="w-12 h-16 bg-muted rounded"></div>
        <div className="flex-1">
          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    ))}</div>;
  }

  if (trendingBooks.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">
        No trending books at the moment
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {trendingBooks.map((book, index) => (
        <div key={book.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
          <div className="text-lg font-bold text-muted-foreground w-6">
            #{index + 1}
          </div>
          
          {book.coverUrl && (
            <img 
              src={book.coverUrl} 
              alt={book.title}
              className="w-12 h-16 object-cover rounded"
            />
          )}
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{book.title}</h4>
            <p className="text-sm text-muted-foreground truncate">{book.description}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>❤️ {book.likes}</span>
              <span>🔄 {book.shares}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Component for popular users
function PopularUsers() {
  const [popularUsers, setPopularUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchPopularUsers = async () => {
      try {
        const response = await api('/gamification/leaderboard');
        if (response.ok) {
          const users = await response.json();
          setPopularUsers(users);
        }
      } catch (error) {
        console.error('Error fetching popular users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularUsers();
  }, []);

  if (loading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => (
      <div key={i} className="animate-pulse flex items-center gap-3">
        <div className="w-10 h-10 bg-muted rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-muted rounded w-1/4"></div>
        </div>
      </div>
    ))}</div>;
  }

  if (popularUsers.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">
        No popular users at the moment
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {popularUsers.slice(0, 5).map((user, index) => (
        <div key={user.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
          <div className="text-lg font-bold text-muted-foreground w-6">
            #{index + 1}
          </div>
          
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold">
              {(user.displayName || user.name).charAt(0).toUpperCase()}
            </span>
          </div>
          
          <div className="flex-1">
            <h4 className="font-semibold">{user.displayName || user.name}</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Level {user.level}</span>
              <span>•</span>
              <span>{user.points} points</span>
              <span>•</span>
              <span>{user.title}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}