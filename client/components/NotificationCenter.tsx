'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Bell, 
  Users, 
  UserPlus, 
  Heart, 
  MessageSquare, 
  AtSign,
  X,
  Check,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSocket } from '@/hooks/useSocket';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'follow' | 'friend_request' | 'friend_request_accepted' | 'like' | 'comment' | 'mention';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket } = useSocket();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (socket) {
      // Listen for new notifications
      socket.on('notification', (notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      // Listen for notifications read event
      socket.on('notificationsRead', () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      });

      return () => {
        socket.off('notification');
        socket.off('notificationsRead');
      };
    }
  }, [socket]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    if (socket) {
      socket.emit('markNotificationsRead');
    }
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notifications.find(n => n.id === id)?.read === false) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'friend_request':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'friend_request_accepted':
        return <UserPlus className="w-4 h-4 text-purple-500" />;
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-yellow-500" />;
      case 'mention':
        return <AtSign className="w-4 h-4 text-indigo-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationAction = (notification: Notification) => {
    switch (notification.type) {
      case 'follow':
      case 'friend_request_accepted':
        return (
          <Link href={`/profile/${notification.data?.followerId || notification.data?.receiverId}`}>
            <Button size="sm" variant="outline">
              <ExternalLink className="w-3 h-3 mr-1" />
              View Profile
            </Button>
          </Link>
        );
      case 'friend_request':
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="default">
              <Check className="w-3 h-3 mr-1" />
              Accept
            </Button>
            <Button size="sm" variant="outline">
              Decline
            </Button>
          </div>
        );
      case 'like':
        return (
          <Link href={`/feed`}>
            <Button size="sm" variant="outline">
              <ExternalLink className="w-3 h-3 mr-1" />
              View Post
            </Button>
          </Link>
        );
      case 'comment':
        return (
          <Link href={`/profile/${notification.data?.profileId}?tab=wall`}>
            <Button size="sm" variant="outline">
              <MessageSquare className="w-3 h-3 mr-1" />
              View Comment
            </Button>
          </Link>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs p-0"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden z-50 shadow-lg">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button size="sm" variant="ghost" onClick={markAllAsRead}>
                    Mark all read
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 ${
                        !notification.read ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                              onClick={() => clearNotification(notification.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                            
                            {getNotificationAction(notification)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}