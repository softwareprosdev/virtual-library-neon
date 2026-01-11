'use client';

import { useState, useEffect, useCallback, ElementType } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FollowButton from '@/components/FollowButton';
import {
  User, 
  MapPin, 
  Globe, 
  MessageSquare, 
  Settings, 
  Music, 
  Palette,
  Camera,
  Edit3,
  Share2,
  Eye,
  Users,
  Bookmark,
  Star,
  Link2,
  Twitter,
  Github,
  Instagram,
  Linkedin,
  Layout,
  Facebook,
  Youtube,
  Video,
  Ghost,
  Pin,
  BookOpen,
  Plus,
  Heart,
  ExternalLink,
  Trash2,
  PinIcon,
  Send
} from 'lucide-react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';

interface BookPost {
  id: string;
  title: string;
  description: string;
  coverUrl?: string;
  purchaseUrl?: string;
  previewUrl?: string;
  genre?: string;
  publishedDate?: string;
  likes: number;
  shares: number;
  isPinned: boolean;
  createdAt: string;
  // Amazon and affiliate fields
  asin?: string;
  isbn?: string;
  author?: string;
  price?: string;
  currency?: string;
  platform?: string;
  isAuthorOwn?: boolean;
  affiliateUrl?: string;
  clickCount?: number;
}

interface ProfileFriend {
  id: string;
  name: string;
  displayName?: string;
  avatarUrl?: string;
}

interface ProfileComment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string | null>;
  interests: string[];
  statusMessage?: string;
  profileLayout: string;
  isProfilePublic: boolean;
  profileViews: number;
  profileTheme?: Record<string, string>;
  profileSong?: string;
  profileSongTitle?: string;
  profileBackground?: string;
  topFriends: ProfileFriend[];
  createdAt: string;
  level: number;
  points: number;
  _count?: {
    profileComments: number;
    receivedProfileVisits: number;
  };
}

const THEME_PRESETS = [
  { 
    id: 'neon', 
    name: 'Neon Dreams', 
    colors: { primary: '#00f0ff', secondary: '#fcee0a', background: '#0a0a0f', text: '#ffffff' }
  },
  { 
    id: 'cyberpunk', 
    name: 'Cyberpunk', 
    colors: { primary: '#ff006e', secondary: '#ffbe0b', background: '#1a0033', text: '#ffffff' }
  },
  { 
    id: 'blood-rave', 
    name: 'Blood Rave', 
    colors: { primary: '#ff0000', secondary: '#8a0000', background: '#000000', text: '#ffcccc' }
  },
  { 
    id: 'vampire', 
    name: 'Vampire', 
    colors: { primary: '#990000', secondary: '#4d0000', background: '#1a0505', text: '#e6e6e6' }
  },
  { 
    id: 'goth', 
    name: 'Goth', 
    colors: { primary: '#666666', secondary: '#333333', background: '#000000', text: '#d9d9d9' }
  },
  { 
    id: 'pastel', 
    name: 'Pastel Kawaii', 
    colors: { primary: '#ffb3ba', secondary: '#bae1ff', background: '#fff0f3', text: '#333333' }
  },
  { 
    id: 'dark', 
    name: 'Dark Mode', 
    colors: { primary: '#818cf8', secondary: '#c084fc', background: '#1f2937', text: '#f9fafb' }
  },
  { 
    id: 'minimal', 
    name: 'Minimal', 
    colors: { primary: '#000000', secondary: '#666666', background: '#ffffff', text: '#000000' }
  }
];

const LAYOUT_OPTIONS = [
  { id: 'default', name: 'Default', icon: '📱' },
  { id: 'creative', name: 'Creative', icon: '🎨' },
  { id: 'minimalist', name: 'Minimalist', icon: '⚪' },
  { id: 'neon', name: 'Neon Grid', icon: '💫' }
];

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUserId(getUser()?.id || null);
  }, []);

  const isOwnProfile = currentUserId === userId;

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    location: '',
    website: '',
    statusMessage: '',
    interests: [] as string[],
    socialLinks: {} as Record<string, string>,
    isProfilePublic: true,
    profileLayout: 'default',
    profileSong: '',
    profileSongTitle: '',
    profileBackground: ''
  });
  const [selectedTheme, setSelectedTheme] = useState('neon');
  const [interestInput, setInterestInput] = useState('');
  
  // Books State
  const [bookPosts, setBookPosts] = useState<BookPost[]>([]);
  const [showBookPostDialog, setShowBookPostDialog] = useState(false);
  const [newBookPost, setNewBookPost] = useState({
    title: '',
    description: '',
    coverUrl: '',
    purchaseUrl: '',
    previewUrl: '',
    genre: '',
    author: '',
    asin: '',
    isbn: '',
    price: '',
    currency: 'USD',
    platform: 'amazon',
    isAuthorOwn: false
  });

  // Comments State
  const [comments, setComments] = useState<ProfileComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  
  // File input ref for avatar upload
  const fileInputRef = useState<HTMLInputElement | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api(`/users/${userId}/profile`);
      
      if (!response.ok) {
        console.error('Failed to fetch profile:', response.status);
        setUser(null);
        return;
      }
      
      const userData = await response.json();
      
      // Ensure arrays are properly initialized
      const safeUserData = {
        ...userData,
        interests: Array.isArray(userData.interests) ? userData.interests : [],
        topFriends: Array.isArray(userData.topFriends) ? userData.topFriends : [],
        socialLinks: userData.socialLinks || {}
      };
      
      setUser(safeUserData);
      
      setEditForm({
        displayName: safeUserData.displayName || '',
        bio: safeUserData.bio || '',
        location: safeUserData.location || '',
        website: safeUserData.website || '',
        statusMessage: safeUserData.statusMessage || '',
        interests: safeUserData.interests,
        socialLinks: safeUserData.socialLinks,
        isProfilePublic: safeUserData.isProfilePublic ?? true,
        profileLayout: safeUserData.profileLayout || 'default',
        profileSong: safeUserData.profileSong || '',
        profileSongTitle: safeUserData.profileSongTitle || '',
        profileBackground: safeUserData.profileBackground || ''
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      // Direct fetch call needed for FormData since api wrapper might assume JSON
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/users/${userId}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setUser(prev => prev ? { ...prev, avatarUrl: data.avatarUrl } : null);
        alert('Profile picture updated!');
      } else {
        alert('Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert('Error uploading profile picture');
    }
  };

  const fetchBookPosts = useCallback(async () => {
    try {
      const response = await api(`/book-posts/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setBookPosts(data);
      }
    } catch (error) {
      console.error('Failed to fetch book posts:', error);
    }
  }, [userId]);

  const fetchComments = useCallback(async () => {
    try {
      setLoadingComments(true);
      const response = await api(`/users/${userId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
    fetchBookPosts();
    fetchComments();
  }, [fetchProfile, fetchBookPosts, fetchComments]);

  const saveProfile = async () => {
    try {
      const response = await api(`/users/${userId}/profile`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        setEditing(false);
        // Show success feedback
        alert('Profile updated successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Profile update failed:', errorData);
        alert(errorData.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    try {
      const response = await api(`/users/${userId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment })
      });
      
      if (response.ok) {
        setNewComment('');
        fetchComments();
        // Also refresh profile to update comment count if we were displaying it live
        fetchProfile(); 
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  const addInterest = () => {
    if (interestInput.trim() && editForm.interests.length < 10) {
      setEditForm(prev => ({
        ...prev,
        interests: [...prev.interests, interestInput.trim()]
      }));
      setInterestInput('');
    }
  };

  const removeInterest = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      interests: prev.interests.filter((_, i) => i !== index)
    }));
  };

  const updateTheme = async (themeId: string) => {
    try {
      const theme = THEME_PRESETS.find(t => t.id === themeId);
      if (theme) {
        await api(`/users/${userId}/theme`, {
          method: 'PUT',
          body: JSON.stringify({ theme: theme.colors })
        });
        setSelectedTheme(themeId);
        // Also update local user state for immediate feedback
        if (user) {
          setUser({ ...user, profileTheme: theme.colors });
        }
      }
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  const updateLayout = async (layoutId: string) => {
    try {
      // Reuse the generic profile update endpoint
      const response = await api(`/users/${userId}/profile`, {
        method: 'PUT',
        body: JSON.stringify({ profileLayout: layoutId })
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to update layout:', error);
    }
  };

  const recordProfileView = useCallback(async () => {
    if (!isOwnProfile && user) {
      await api(`/users/${userId}/visit`, { method: 'POST' });
    }
  }, [isOwnProfile, user, userId]);

  const shareProfile = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url);
    alert('Profile link copied to clipboard!');
  };

  const createBookPost = async () => {
    try {
      const response = await api('/book-posts', {
        method: 'POST',
        body: JSON.stringify(newBookPost)
      });
      if (response.ok) {
        setShowBookPostDialog(false);
        setNewBookPost({ 
          title: '', 
          description: '', 
          coverUrl: '', 
          purchaseUrl: '', 
          previewUrl: '', 
          genre: '',
          author: '',
          asin: '',
          isbn: '',
          price: '',
          currency: 'USD',
          platform: 'amazon',
          isAuthorOwn: false
        });
        fetchBookPosts();
      }
    } catch (error) {
      console.error('Failed to create book post:', error);
    }
  };

  const deleteBookPost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this book post?')) return;
    try {
      const response = await api(`/book-posts/${postId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchBookPosts();
      }
    } catch (error) {
      console.error('Failed to delete book post:', error);
    }
  };

  const likeBookPost = async (postId: string) => {
    try {
      await api(`/book-posts/${postId}/like`, { method: 'POST' });
      fetchBookPosts();
    } catch (error) {
      console.error('Failed to like book post:', error);
    }
  };

  const handleAffiliateClick = async (post: BookPost) => {
    // Track the click
    try {
      await api(`/book-posts/${post.id}/click`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to track click:', error);
    }
    
    // Open affiliate URL in new tab
    const url = post.affiliateUrl || post.purchaseUrl;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const shareBookPost = async (post: BookPost, platform: string) => {
    const shareUrl = `${window.location.origin}/profile/${userId}?book=${post.id}`;
    const text = `Check out "${post.title}" by ${user?.displayName || user?.name}!`;
    
    await api(`/book-posts/${post.id}/share`, { method: 'POST' });
    
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      copy: shareUrl
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    } else {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  useEffect(() => {
    if (user) recordProfileView();
  }, [user, recordProfileView]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-bold mb-2">Profile Not Found</h2>
              <p className="text-muted-foreground">This user profile doesn&apos;t exist or isn&apos;t public.</p>
              <Button className="mt-4" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const theme = user.profileTheme || THEME_PRESETS[0].colors;
  const profileBackgroundStyle = user.profileBackground ? {
    backgroundImage: `url(${user.profileBackground})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  } : {};

  return (
    <MainLayout fullWidth={true}>
      <div
        className="min-h-screen w-full transition-colors duration-500"
        style={{
          ...profileBackgroundStyle,
          backgroundColor: theme.background || 'var(--background)',
          color: theme.text || 'var(--foreground)'
        }}
      >
        {/* Profile Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent"></div>
          
          <div className="relative z-10 p-6 sm:p-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                
                {/* Avatar Section */}
                <div className="flex flex-col items-center sm:items-start gap-4">
                  <div className="relative group">
                    <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white/20">
                      <AvatarImage src={user.avatarUrl} alt={user.displayName || user.name} />
                      <AvatarFallback className="text-2xl font-bold">
                        {(user.displayName || user.name).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {isOwnProfile && (
                      <Button
                        size="sm"
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full z-10 bg-primary hover:bg-primary/90 shadow-lg"
                        onClick={() => setEditing(true)}
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                      {user.displayName || user.name}
                    </h1>
                    <div className="flex items-center gap-2 text-sm opacity-80">
                      <MapPin className="w-4 h-4" />
                      {user.location || 'Unknown Location'}
                    </div>
                    {user.website && (
                      <div className="flex items-center gap-2 text-sm opacity-80 mt-1">
                        <Globe className="w-4 h-4" />
                        <a 
                          href={user.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {user.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    {user.statusMessage && (
                      <div className="mt-2 p-2 bg-white/10 rounded-lg text-sm">
                        💭 {user.statusMessage}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats & Actions */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full">
                      <Eye className="w-4 h-4" />
                      {user.profileViews || 0} views
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full">
                      <Users className="w-4 h-4" />
                      Level {user.level}
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full">
                      <Star className="w-4 h-4" />
                      {user.points || 0} points
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    {isOwnProfile ? (
                      <>
                        <Button onClick={() => setEditing(true)}>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                        <Button variant="outline" onClick={() => router.push('/settings')}>
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </Button>
                      </>
                    ) : (
                      <>
                        <FollowButton 
                          targetUserId={userId} 
                          currentUserId={currentUserId}
                        />
                        <Button variant="outline">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message
                        </Button>
                        <Button variant="outline" onClick={shareProfile}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 p-6 sm:p-8">
          <div className="max-w-6xl mx-auto">
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="mybooks">My Books</TabsTrigger>
                <TabsTrigger value="wall">Wall</TabsTrigger>
                <TabsTrigger value="friends">Friends</TabsTrigger>
                <TabsTrigger value="interests">Interests</TabsTrigger>
                <TabsTrigger value="customization">Style</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>About {user.displayName || user.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {user.bio && (
                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Bio
                        </h3>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {user.bio}
                        </p>
                      </div>
                    )}
                    
                    {user.socialLinks && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Link2 className="w-4 h-4" />
                          Social Links
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          {Object.entries(user.socialLinks).map(([platform, url]) => {
                            const icons: { [key: string]: ElementType } = {
                              twitter: Twitter,
                              github: Github,
                              instagram: Instagram,
                              linkedin: Linkedin,
                              facebook: Facebook,
                              youtube: Youtube,
                              tiktok: Video,
                              snapchat: Ghost,
                              pinterest: Pin
                            };
                            const Icon = icons[platform];
                            return url && Icon ? (
                              <a
                                key={platform}
                                href={url as string}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                              >
                                <Icon className="w-5 h-5" />
                              </a>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Bookmark className="w-4 h-4" />
                        Reading Stats
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div className="bg-white/5 p-3 rounded-lg">
                          <div className="font-bold">{user._count?.profileComments || 0}</div>
                          <div className="text-xs opacity-70">Comments</div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg">
                          <div className="font-bold">{user._count?.receivedProfileVisits || 0}</div>
                          <div className="text-xs opacity-70">Profile Visits</div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg">
                          <div className="font-bold">{user.points || 0}</div>
                          <div className="text-xs opacity-70">Points</div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg">
                          <div className="font-bold">{user.level || 1}</div>
                          <div className="text-xs opacity-70">Level</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="wall" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>The Wall</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Add Comment */}
                    {currentUserId && (
                      <div className="flex gap-4">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>ME</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <Textarea 
                            placeholder="Write something..." 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="bg-white/5"
                          />
                          <div className="flex justify-end">
                            <Button size="sm" onClick={postComment} disabled={!newComment.trim()}>
                              <Send className="w-4 h-4 mr-2" />
                              Post Comment
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Comments List */}
                    <div className="space-y-4">
                      {loadingComments ? (
                        <div className="text-center py-4">Loading comments...</div>
                      ) : comments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No comments yet. Be the first to say hello!</p>
                        </div>
                      ) : (
                        comments.map((comment) => (
                          <div key={comment.id} className="flex gap-4 p-4 bg-white/5 rounded-lg">
                            <Link href={`/profile/${comment.author.id}`}>
                              <Avatar className="w-10 h-10 border border-white/20">
                                <AvatarImage src={comment.author.avatarUrl} />
                                <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <Link href={`/profile/${comment.author.id}`} className="font-semibold hover:underline">
                                  {comment.author.displayName || comment.author.name}
                                </Link>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mybooks" className="mt-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      My Published Books
                    </CardTitle>
                    {isOwnProfile && (
                      <Button onClick={() => setShowBookPostDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Book
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {bookPosts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{isOwnProfile ? "You haven't shared any books yet" : "No books shared yet"}</p>
                        {isOwnProfile && (
                          <Button variant="outline" className="mt-4" onClick={() => setShowBookPostDialog(true)}>
                            Share Your First Book
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {bookPosts.map((post) => (
                          <div key={post.id} className="border rounded-lg overflow-hidden bg-white/5 hover:bg-white/10 transition-colors">
                            {post.coverUrl && (
                              <div className="aspect-[3/4] max-h-48 overflow-hidden">
                                <img src={post.coverUrl} alt={post.title} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-bold text-lg">{post.title}</h3>
                                {post.isPinned && <PinIcon className="w-4 h-4 text-primary" />}
                              </div>
                              {post.genre && <Badge variant="secondary" className="mb-2">{post.genre}</Badge>}
                              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{post.description}</p>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                <span className="flex items-center gap-1">
                                  <Heart className="w-4 h-4" /> {post.likes}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Share2 className="w-4 h-4" /> {post.shares}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {post.purchaseUrl && (
                                  <a href={post.purchaseUrl} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="default">
                                      <ExternalLink className="w-3 h-3 mr-1" /> Buy
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
                                
                                {/* Social Share Buttons */}
                                <div className="flex gap-1 ml-auto">
                                  <Button size="sm" variant="ghost" onClick={() => shareBookPost(post, 'twitter')} title="Share on Twitter">
                                    <Twitter className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => shareBookPost(post, 'facebook')} title="Share on Facebook">
                                    <Facebook className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => shareBookPost(post, 'linkedin')} title="Share on LinkedIn">
                                    <Linkedin className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => shareBookPost(post, 'copy')} title="Copy Link">
                                    <Link2 className="w-3 h-3" />
                                  </Button>
                                </div>
                                
                                {isOwnProfile && (
                                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteBookPost(post.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="interests" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Interests & Hobbies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isOwnProfile && editing ? (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add an interest..."
                            value={interestInput}
                            onChange={(e) => setInterestInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                            className="flex-1"
                          />
                          <Button onClick={addInterest}>Add</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {editForm.interests.map((interest, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => removeInterest(index)}
                            >
                              {interest} ×
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {user.interests.map((interest, index) => (
                          <Badge key={index} variant="secondary">
                            {interest}
                          </Badge>
                        ))}
                        {user.interests.length === 0 && (
                          <p className="text-muted-foreground italic">
                            No interests listed yet
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="customization" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Customization</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Theme Presets
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {THEME_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => {
                              if (isOwnProfile) {
                                updateTheme(preset.id);
                              }
                            }}
                            disabled={!isOwnProfile}
                            className={`
                              p-3 rounded-lg border-2 transition-all cursor-pointer
                              ${selectedTheme === preset.id
                                ? 'border-primary bg-primary/20 ring-2 ring-primary/50'
                                : 'border-white/20 hover:border-white/40 hover:scale-105'
                              }
                              ${!isOwnProfile ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}
                            `}
                            style={{
                              backgroundColor: preset.colors.background,
                              borderColor: selectedTheme === preset.id ? preset.colors.primary : undefined,
                              pointerEvents: isOwnProfile ? 'auto' : 'none'
                            }}
                          >
                            <div
                              className="w-8 h-8 rounded-full mx-auto mb-2 transition-transform"
                              style={{ backgroundColor: preset.colors.primary }}
                            ></div>
                            <div className="text-xs font-medium" style={{ color: preset.colors.text }}>
                              {preset.name}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Layout className="w-4 h-4" />
                        Profile Layout
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {LAYOUT_OPTIONS.map((layout) => (
                          <button
                            key={layout.id}
                            disabled={!isOwnProfile}
                            onClick={() => updateLayout(layout.id)}
                            className={`
                              p-4 rounded-lg border-2 transition-all text-center
                              ${user.profileLayout === layout.id 
                                ? 'border-primary bg-primary/20' 
                                : 'border-white/20 hover:border-white/40'
                              }
                              ${!isOwnProfile ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                          >
                            <div className="text-2xl mb-2">{layout.icon}</div>
                            <div className="text-xs font-medium">{layout.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {user.profileSong && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Music className="w-4 h-4" />
                          Profile Song
                        </h3>
                        <div className="bg-white/10 p-4 rounded-lg">
                          <audio controls className="w-full">
                            <source src={user.profileSong} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                          <div className="text-sm mt-2 font-medium">
                            {user.profileSongTitle}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="friends" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top 8 Friends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      {user.topFriends.length > 0 ? (
                        user.topFriends.map((friend) => (
                          <Link key={friend.id} href={`/profile/${friend.id}`} className="group text-center">
                            <div className="relative mb-3 inline-block">
                              <Avatar className="w-20 h-20 border-2 border-transparent group-hover:border-primary transition-all">
                                <AvatarImage src={friend.avatarUrl} />
                                <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="text-sm font-semibold group-hover:text-primary transition-colors">
                              {friend.displayName || friend.name}
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No top friends listed yet</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Profile Song (auto-playing) */}
        {user.profileSong && (
          <audio autoPlay loop className="hidden">
            <source src={user.profileSong} type="audio/mpeg" />
          </audio>
        )}

        {/* Edit Profile Dialog */}
        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  value={editForm.displayName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="How should we display your name?"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Bio</label>
                <Textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={editForm.location}
                  onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="City, Country"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Website</label>
                <Input
                  value={editForm.website}
                  onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Status Message</label>
                <Input
                  value={editForm.statusMessage}
                  onChange={(e) => setEditForm(prev => ({ ...prev, statusMessage: e.target.value }))}
                  placeholder="What's on your mind?"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Profile Layout</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={editForm.profileLayout}
                  onChange={(e) => setEditForm(prev => ({ ...prev, profileLayout: e.target.value }))}
                >
                  {LAYOUT_OPTIONS.map(layout => (
                    <option key={layout.id} value={layout.id}>
                      {layout.icon} {layout.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Profile Background URL</label>
                <Input
                  value={editForm.profileBackground || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, profileBackground: e.target.value }))}
                  placeholder="https://example.com/background.jpg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Profile Song URL</label>
                  <Input
                    value={editForm.profileSong || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, profileSong: e.target.value }))}
                    placeholder="https://example.com/song.mp3"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Song Title</label>
                  <Input
                    value={editForm.profileSongTitle || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, profileSongTitle: e.target.value }))}
                    placeholder="Song Title - Artist"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Social Links</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Twitter URL"
                    value={editForm.socialLinks.twitter || ''}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      socialLinks: { ...prev.socialLinks, twitter: e.target.value } 
                    }))}
                  />
                  <Input
                    placeholder="Instagram URL"
                    value={editForm.socialLinks.instagram || ''}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      socialLinks: { ...prev.socialLinks, instagram: e.target.value } 
                    }))}
                  />
                  <Input
                    placeholder="GitHub URL"
                    value={editForm.socialLinks.github || ''}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      socialLinks: { ...prev.socialLinks, github: e.target.value } 
                    }))}
                  />
                  <Input
                    placeholder="LinkedIn URL"
                    value={editForm.socialLinks.linkedin || ''}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      socialLinks: { ...prev.socialLinks, linkedin: e.target.value } 
                    }))}
                  />
                  <Input
                    placeholder="Facebook URL"
                    value={editForm.socialLinks.facebook || ''}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      socialLinks: { ...prev.socialLinks, facebook: e.target.value } 
                    }))}
                  />
                  <Input
                    placeholder="YouTube URL"
                    value={editForm.socialLinks.youtube || ''}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      socialLinks: { ...prev.socialLinks, youtube: e.target.value } 
                    }))}
                  />
                  <Input
                    placeholder="TikTok URL"
                    value={editForm.socialLinks.tiktok || ''}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      socialLinks: { ...prev.socialLinks, tiktok: e.target.value } 
                    }))}
                  />
                  <Input
                    placeholder="Snapchat URL"
                    value={editForm.socialLinks.snapchat || ''}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      socialLinks: { ...prev.socialLinks, snapchat: e.target.value } 
                    }))}
                  />
                  <Input
                    placeholder="Pinterest URL"
                    value={editForm.socialLinks.pinterest || ''}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      socialLinks: { ...prev.socialLinks, pinterest: e.target.value } 
                    }))}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="public-profile"
                  checked={editForm.isProfilePublic}
                  onChange={(e) => setEditForm(prev => ({ ...prev, isProfilePublic: e.target.checked }))}
                />
                <label htmlFor="public-profile" className="text-sm">
                  Make profile public
                </label>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={saveProfile}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Book Post Dialog */}
        <Dialog open={showBookPostDialog} onOpenChange={setShowBookPostDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Share Your Book
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Book Title *</label>
                <Input
                  value={newBookPost.title}
                  onChange={(e) => setNewBookPost(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter your book title"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description *</label>
                <Textarea
                  value={newBookPost.description}
                  onChange={(e) => setNewBookPost(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell readers about your book..."
                  rows={4}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Cover Image URL</label>
                <Input
                  value={newBookPost.coverUrl}
                  onChange={(e) => setNewBookPost(prev => ({ ...prev, coverUrl: e.target.value }))}
                  placeholder="https://example.com/cover.jpg"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Genre</label>
                <Input
                  value={newBookPost.genre}
                  onChange={(e) => setNewBookPost(prev => ({ ...prev, genre: e.target.value }))}
                  placeholder="Fiction, Non-fiction, Fantasy, etc."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Author</label>
                <Input
                  value={newBookPost.author}
                  onChange={(e) => setNewBookPost(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Book author name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">ISBN</label>
                  <Input
                    value={newBookPost.isbn}
                    onChange={(e) => setNewBookPost(prev => ({ ...prev, isbn: e.target.value }))}
                    placeholder="978-xxx-xxx-xxx-x"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">ASIN (Amazon)</label>
                  <Input
                    value={newBookPost.asin}
                    onChange={(e) => setNewBookPost(prev => ({ ...prev, asin: e.target.value }))}
                    placeholder="Amazon ASIN if available"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newBookPost.price}
                    onChange={(e) => setNewBookPost(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="19.99"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Currency</label>
                  <select 
                    value={newBookPost.currency}
                    onChange={(e) => setNewBookPost(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full p-2 border rounded"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Platform</label>
                <select 
                  value={newBookPost.platform}
                  onChange={(e) => setNewBookPost(prev => ({ ...prev, platform: e.target.value }))}
                  className="w-full p-2 border rounded"
                >
                  <option value="amazon">Amazon</option>
                  <option value="barnesandnoble">Barnes & Noble</option>
                  <option value="kobo">Kobo</option>
                  <option value="googlebooks">Google Books</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Purchase Link *</label>
                <Input
                  value={newBookPost.purchaseUrl}
                  onChange={(e) => setNewBookPost(prev => ({ ...prev, purchaseUrl: e.target.value }))}
                  placeholder="https://amazon.com/dp/ASIN"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isAuthorOwn"
                  checked={newBookPost.isAuthorOwn}
                  onChange={(e) => setNewBookPost(prev => ({ ...prev, isAuthorOwn: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isAuthorOwn" className="text-sm font-medium">
                  I am the author of this book
                </label>
              </div>
              
              <div>
                <label className="text-sm font-medium">Preview/Read Link</label>
                <Input
                  value={newBookPost.previewUrl}
                  onChange={(e) => setNewBookPost(prev => ({ ...prev, previewUrl: e.target.value }))}
                  placeholder="https://example.com/preview"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowBookPostDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createBookPost} disabled={!newBookPost.title || !newBookPost.description || !newBookPost.purchaseUrl}>
                  Share Book
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}