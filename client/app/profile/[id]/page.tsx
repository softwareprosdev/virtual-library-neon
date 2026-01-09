'use client';

import { useState, useEffect, useCallback, ElementType } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Pin
} from 'lucide-react';
import { api } from '@/lib/api';

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
  topFriends: string[];
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
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
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
    profileLayout: 'default'
  });
  const [selectedTheme, setSelectedTheme] = useState('neon');
  const [interestInput, setInterestInput] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api(`/users/${userId}/profile`);
      const userData = await response.json();
      setUser(userData);
      
      if (userData) {
        setEditForm({
          displayName: userData.displayName || '',
          bio: userData.bio || '',
          location: userData.location || '',
          website: userData.website || '',
          statusMessage: userData.statusMessage || '',
          interests: userData.interests || [],
          socialLinks: userData.socialLinks || {},
          isProfilePublic: userData.isProfilePublic,
          profileLayout: userData.profileLayout || 'default'
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = async () => {
    try {
      const response = await api(`/users/${userId}/profile`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      
      if (response.ok) {
        setUser(await response.json());
        setEditing(false);
        // Add profile visit if own profile
        if (isOwnProfile) {
          await api(`/profiles/${userId}/visit`, { method: 'POST' });
        }
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
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
      }
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  const recordProfileView = useCallback(async () => {
    if (!isOwnProfile && user) {
      await api(`/profiles/${userId}/visit`, { method: 'POST' });
    }
  }, [isOwnProfile, user, userId]);

  const shareProfile = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url);
    alert('Profile link copied to clipboard!');
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
    <MainLayout>
      <div 
        className="min-h-screen"
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
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full"
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
                        <Button>
                          <Users className="w-4 h-4 mr-2" />
                          Follow
                        </Button>
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
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="interests">Interests</TabsTrigger>
                <TabsTrigger value="customization">Style</TabsTrigger>
                <TabsTrigger value="friends">Friends</TabsTrigger>
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
                            onClick={() => isOwnProfile && updateTheme(preset.id)}
                            disabled={!isOwnProfile}
                            className={`
                              p-3 rounded-lg border-2 transition-all
                              ${selectedTheme === preset.id 
                                ? 'border-primary bg-primary/20' 
                                : 'border-white/20 hover:border-white/40'
                              }
                              ${!isOwnProfile ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            style={{
                              backgroundColor: preset.colors.background,
                              borderColor: selectedTheme === preset.id ? preset.colors.primary : undefined
                            }}
                          >
                            <div 
                              className="w-8 h-8 rounded-full mx-auto mb-2"
                              style={{ backgroundColor: preset.colors.primary }}
                            ></div>
                            <div className="text-xs font-medium">{preset.name}</div>
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
                    <CardTitle>Top Friends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {user.topFriends.length > 0 ? (
                        user.topFriends.map((friendId, index) => (
                          <div key={index} className="text-center">
                            <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-2 flex items-center justify-center">
                              <Users className="w-8 h-8" />
                            </div>
                            <div className="text-xs font-medium">
                              Friend {index + 1}
                            </div>
                          </div>
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
      </div>
    </MainLayout>
  );
}