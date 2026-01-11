'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import StoryViewer from './StoryViewer';
import StoryCreator from './StoryCreator';

interface StoryUser {
  id: string;
  name: string;
  displayName?: string;
  avatarUrl?: string;
  hasUnviewed: boolean;
}

interface Story {
  id: string;
  imageUrl?: string;
  text?: string;
  backgroundColor?: string;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
  user: {
    id: string;
    name: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export default function StoriesBar() {
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [showCreator, setShowCreator] = useState(false);

  const currentUser = getUser();

  useEffect(() => {
    fetchStoryUsers();
  }, []);

  const fetchStoryUsers = async () => {
    try {
      const response = await api('/stories/users');
      if (response.ok) {
        const data = await response.json();
        setStoryUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching story users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (userId: string) => {
    try {
      const response = await api(`/stories/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
        setSelectedUserId(userId);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const handleCloseViewer = () => {
    setSelectedUserId(null);
    setStories([]);
    fetchStoryUsers(); // Refresh to update viewed status
  };

  const handleStoryCreated = () => {
    setShowCreator(false);
    fetchStoryUsers();
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-muted" />
            <div className="w-12 h-3 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {/* Create Story Button */}
        {currentUser && (
          <button
            onClick={() => setShowCreator(true)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-dashed border-primary/50">
                <AvatarImage src={undefined} />
                <AvatarFallback className="bg-primary/10">
                  <Plus className="w-6 h-6 text-primary" />
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs text-muted-foreground">Add Story</span>
          </button>
        )}

        {/* Story Users */}
        {storyUsers.map((user) => (
          <button
            key={user.id}
            onClick={() => handleUserClick(user.id)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div
              className={`p-0.5 rounded-full ${
                user.hasUnviewed
                  ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500'
                  : 'bg-muted'
              }`}
            >
              <Avatar className="w-14 h-14 border-2 border-background">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback>
                  {(user.displayName || user.name).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs text-muted-foreground truncate max-w-16">
              {user.displayName || user.name.split(' ')[0]}
            </span>
          </button>
        ))}

        {storyUsers.length === 0 && !currentUser && (
          <p className="text-sm text-muted-foreground py-4">
            No stories yet. Be the first to share!
          </p>
        )}
      </div>

      {/* Story Viewer Modal */}
      {selectedUserId && stories.length > 0 && (
        <StoryViewer stories={stories} onClose={handleCloseViewer} />
      )}

      {/* Story Creator Modal */}
      {showCreator && (
        <StoryCreator
          onClose={() => setShowCreator(false)}
          onCreated={handleStoryCreated}
        />
      )}
    </>
  );
}
