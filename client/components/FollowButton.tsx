'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, UserCheck, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface FollowButtonProps {
  targetUserId: string;
  currentUserId?: string | null;
  className?: string;
}

export default function FollowButton({ targetUserId, currentUserId, className }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'friends' | 'request_sent' | 'request_received'>('none');

  const isOwnProfile = currentUserId === targetUserId;

  useEffect(() => {
    if (currentUserId && !isOwnProfile) {
      checkRelationshipStatus();
      fetchFollowStats();
    }
  }, [currentUserId, targetUserId, isOwnProfile]);

  const checkRelationshipStatus = async () => {
    try {
      // Check follow status
      const followResponse = await api(`/follows/check/${targetUserId}`);
      if (followResponse.ok) {
        const data = await followResponse.json();
        setIsFollowing(data.isFollowing);
      }

      // Check friendship status
      const friendResponse = await api(`/friend-requests/status/${targetUserId}`);
      if (friendResponse.ok) {
        const data = await friendResponse.json();
        setFriendshipStatus(data.status);
      }
    } catch (error) {
      console.error('Error checking relationship status:', error);
    }
  };

  const fetchFollowStats = async () => {
    try {
      const response = await api(`/follows/stats/${targetUserId}`);
      if (response.ok) {
        const data = await response.json();
        setFollowersCount(data.followersCount);
      }
    } catch (error) {
      console.error('Error fetching follow stats:', error);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId || isOwnProfile) return;

    setLoading(true);
    try {
      const response = await api('/follows/follow', {
        method: 'POST',
        body: JSON.stringify({ followingId: targetUserId })
      });

      if (response.ok) {
        setIsFollowing(true);
        setFriendshipStatus('none');
        setFollowersCount(prev => prev + 1);
      } else {
        const error = await response.json();
        console.error('Error following user:', error.error);
      }
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUserId || isOwnProfile) return;

    setLoading(true);
    try {
      const response = await api('/follows/unfollow', {
        method: 'DELETE',
        body: JSON.stringify({ followingId: targetUserId })
      });

      if (response.ok) {
        setIsFollowing(false);
        setFriendshipStatus('none');
        setFollowersCount(prev => prev - 1);
      } else {
        const error = await response.json();
        console.error('Error unfollowing user:', error.error);
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isOwnProfile || !currentUserId) {
    return null;
  }

  const getButtonText = () => {
    if (loading) return '';
    if (friendshipStatus === 'friends') return 'Friends';
    if (friendshipStatus === 'request_sent') return 'Request Sent';
    if (friendshipStatus === 'request_received') return 'Accept Request';
    if (isFollowing) return 'Following';
    return 'Follow';
  };

  const getButtonIcon = () => {
    if (loading) return null;
    if (friendshipStatus === 'friends') return <UserCheck className="w-4 h-4 mr-2" />;
    if (friendshipStatus === 'request_sent') return <Clock className="w-4 h-4 mr-2" />;
    if (friendshipStatus === 'request_received') return <UserPlus className="w-4 h-4 mr-2" />;
    if (isFollowing) return <UserCheck className="w-4 h-4 mr-2" />;
    return <UserPlus className="w-4 h-4 mr-2" />;
  };

  const getButtonVariant = () => {
    if (friendshipStatus === 'friends') return 'secondary';
    if (friendshipStatus === 'request_sent') return 'outline';
    if (friendshipStatus === 'request_received') return 'default';
    if (isFollowing) return 'outline';
    return 'default';
  };

  const isButtonDisabled = loading || friendshipStatus === 'request_sent' || friendshipStatus === 'friends';

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={friendshipStatus === 'request_received' ? handleFollow : (isFollowing ? handleUnfollow : handleFollow)}
        disabled={isButtonDisabled}
        variant={getButtonVariant()}
        className={className}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
        ) : (
          getButtonIcon()
        )}
        {getButtonText()}
      </Button>
      
      {friendshipStatus === 'request_received' && (
        <Badge variant="secondary" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      )}
      
      {followersCount > 0 && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground px-2 py-1 bg-muted rounded-full">
          <Users className="w-3 h-3" />
          {followersCount}
        </div>
      )}
    </div>
  );
}