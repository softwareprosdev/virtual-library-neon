'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  BookOpen,
  Users,
  Star,
  Heart,
  Share2,
  Eye,
  Link as LinkIcon,
  Clock,
  Bell
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import Link from 'next/link';

interface Activity {
  id: string;
  type: string;
  details?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

interface BookPost {
  id: string;
  title: string;
  description: string;
  coverUrl?: string;
  purchaseUrl?: string;
  previewUrl?: string;
  genre?: string;
  likes: number;
  shares: number;
  isPinned: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

interface FeedItem {
  id: string;
  type: 'activity' | 'book_post' | 'profile_comment';
  data: Activity | BookPost;
  createdAt: string;
}

interface NewsFeedProps {
  userId?: string; // If provided, shows feed from followed users, otherwise global feed
}

export default function NewsFeed({ userId }: NewsFeedProps) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemsCount, setNewItemsCount] = useState(0);
  const { socket, isConnected } = useSocket();

  const fetchFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/activity/feed';
      if (userId) {
        url = `/activity/feed/following/${userId}`;
      }

      const response = await api(url);
      if (response.ok) {
        const data = await response.json();
        setFeed(data.feed || []);
      } else {
        throw new Error('Failed to fetch feed');
      }
    } catch (error) {
      console.error('Error fetching feed:', error);
      setError('Failed to load feed');
      
      // Fallback to mock data for development
      if (process.env.NODE_ENV === 'development') {
        setFeed(getMockFeedData());
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch feed on mount and when userId changes
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Real-time updates via Socket.io
  useEffect(() => {
    if (!socket) return;

    // Listen for new feed items
    const handleNewFeedItem = (item: FeedItem) => {
      setFeed(prev => {
        // Check if item already exists
        if (prev.some(existing => existing.id === item.id)) {
          return prev;
        }
        setNewItemsCount(count => count + 1);
        return [item, ...prev];
      });
    };

    // Listen for feed item updates (likes, etc.)
    const handleFeedItemUpdated = (updatedItem: FeedItem) => {
      setFeed(prev =>
        prev.map(item => (item.id === updatedItem.id ? updatedItem : item))
      );
    };

    // Listen for new activities
    const handleNewActivity = (activity: Activity) => {
      const feedItem: FeedItem = {
        id: `activity-${activity.id}`,
        type: 'activity',
        data: activity,
        createdAt: activity.createdAt
      };
      handleNewFeedItem(feedItem);
    };

    // Listen for new book posts
    const handleNewBookPost = (post: BookPost) => {
      const feedItem: FeedItem = {
        id: `book-${post.id}`,
        type: 'book_post',
        data: post,
        createdAt: post.createdAt
      };
      handleNewFeedItem(feedItem);
    };

    socket.on('newFeedItem', handleNewFeedItem);
    socket.on('feedItemUpdated', handleFeedItemUpdated);
    socket.on('newActivity', handleNewActivity);
    socket.on('newBookPost', handleNewBookPost);

    return () => {
      socket.off('newFeedItem', handleNewFeedItem);
      socket.off('feedItemUpdated', handleFeedItemUpdated);
      socket.off('newActivity', handleNewActivity);
      socket.off('newBookPost', handleNewBookPost);
    };
  }, [socket]);

  // Clear new items notification when scrolled to top
  const handleShowNewItems = () => {
    setNewItemsCount(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'READ_BOOK':
        return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'JOIN_ROOM':
        return <Users className="w-4 h-4 text-green-500" />;
      case 'CREATE_ROOM':
        return <Users className="w-4 h-4 text-purple-500" />;
      case 'EARN_BADGE':
        return <Star className="w-4 h-4 text-yellow-500" />;
      case 'FOLLOW_USER':
        return <Users className="w-4 h-4 text-pink-500" />;
      case 'UNFOLLOW_USER':
        return <Users className="w-4 h-4 text-gray-500" />;
      case 'CREATE_POST':
        return <BookOpen className="w-4 h-4 text-indigo-500" />;
      case 'LIKE_POST':
        return <Heart className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case 'READ_BOOK':
        return `finished reading a book`;
      case 'JOIN_ROOM':
        return `joined a book discussion`;
      case 'CREATE_ROOM':
        return `created a new room`;
      case 'EARN_BADGE':
        return `earned a new badge`;
      case 'FOLLOW_USER':
        return `started following someone`;
      case 'UNFOLLOW_USER':
        return `unfollowed someone`;
      case 'CREATE_POST':
        return `published a new book`;
      case 'LIKE_POST':
        return `liked a book post`;
      default:
        return activity.details || 'did something';
    }
  };

  const likeBookPost = async (postId: string) => {
    try {
      await api(`/book-posts/${postId}/like`, { method: 'POST' });
      // Update the feed item with new like count
      setFeed(prev => prev.map(item => {
        if (item.type === 'book_post' && (item.data as BookPost).id === postId) {
          const post = item.data as BookPost;
          return { ...item, data: { ...post, likes: post.likes + 1 } };
        }
        return item;
      }));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const shareBookPost = async (post: BookPost) => {
    const shareUrl = `${window.location.origin}/profile/${post.user.id}?book=${post.id}`;
    
    await api(`/book-posts/${post.id}/share`, { method: 'POST' });
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: `Check out "${post.title}" by ${post.user.displayName || post.user.name}!`,
          url: shareUrl
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  const renderFeedItem = (item: FeedItem) => {
    const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

    if (item.type === 'activity') {
      const activity = item.data as Activity;
      return (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Link href={`/profile/${activity.user.id}`}>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={activity.user.avatarUrl} />
                  <AvatarFallback>{activity.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Link>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/profile/${activity.user.id}`} className="font-semibold hover:underline">
                    {activity.user.displayName || activity.user.name}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {getActivityText(activity)}
                  </span>
                </div>
                
                {activity.details && (
                  <p className="text-sm text-muted-foreground mb-2">{activity.details}</p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {getActivityIcon(activity.type)}
                  <span>{timeAgo}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (item.type === 'book_post') {
      const post = item.data as BookPost;
      return (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Link href={`/profile/${post.user.id}`}>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={post.user.avatarUrl} />
                  <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Link>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/profile/${post.user.id}`} className="font-semibold hover:underline">
                    {post.user.displayName || post.user.name}
                  </Link>
                  <span className="text-sm text-muted-foreground">published a book</span>
                  {post.isPinned && <Badge variant="secondary">Pinned</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{timeAgo}</div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="flex gap-4">
              {post.coverUrl && (
                <div className="flex-shrink-0">
                  <img 
                    src={post.coverUrl} 
                    alt={post.title}
                    className="w-16 h-20 object-cover rounded"
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold mb-1">{post.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{post.description}</p>
                
                {post.genre && (
                  <Badge variant="outline" className="text-xs mb-2">{post.genre}</Badge>
                )}
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" /> {post.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="w-3 h-3" /> {post.shares}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {post.purchaseUrl && (
                    <a href={post.purchaseUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="default">
                        <LinkIcon className="w-3 h-3 mr-1" /> Buy
                      </Button>
                    </a>
                  )}
                  {post.previewUrl && (
                    <a href={post.previewUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <Eye className="w-3 h-3 mr-1" /> Preview
                      </Button>
                    </a>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => likeBookPost(post.id)}>
                    <Heart className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => shareBookPost(post)}>
                    <Share2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Unable to load feed</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchFeed}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (feed.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">
            {userId ? 'No updates from followed users' : 'No recent activity'}
          </h3>
          <p className="text-muted-foreground">
            {userId 
              ? 'Follow more users to see their updates here'
              : 'Be the first to start a discussion or share a book!'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* New items notification banner */}
      {newItemsCount > 0 && (
        <Button
          onClick={handleShowNewItems}
          className="w-full bg-primary/90 hover:bg-primary animate-pulse"
        >
          <Bell className="w-4 h-4 mr-2" />
          {newItemsCount} new {newItemsCount === 1 ? 'update' : 'updates'} - Click to view
        </Button>
      )}

      {/* Connection status indicator */}
      {isConnected && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live updates enabled
        </div>
      )}

      {feed.map(renderFeedItem)}
    </div>
  );
}

// Mock data for development
function getMockFeedData(): FeedItem[] {
  return [
    {
      id: '1',
      type: 'activity',
      data: {
        id: 'a1',
        type: 'CREATE_POST',
        details: 'Published "The Art of Coding"',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        user: {
          id: 'user1',
          name: 'Alice Johnson',
          displayName: 'Alice',
          avatarUrl: undefined
        }
      },
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    },
    {
      id: '2',
      type: 'book_post',
      data: {
        id: 'post1',
        title: 'Mystic Tales',
        description: 'A collection of short stories from the magical realm.',
        coverUrl: 'https://picsum.photos/seed/mystic/200/300',
        purchaseUrl: 'https://example.com/mystic',
        genre: 'Fantasy',
        likes: 12,
        shares: 3,
        isPinned: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        user: {
          id: 'user2',
          name: 'Bob Smith',
          displayName: 'Bob',
          avatarUrl: undefined
        }
      },
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
    }
  ];
}