'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  UserPlus, 
  UserCheck, 
  UserX, 
  Clock,
  Send,
  Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import Link from 'next/link';

interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  message?: string;
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: string;
    name: string;
    displayName?: string;
    avatarUrl?: string;
  };
  receiver?: {
    id: string;
    name: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

interface FriendRequestsProps {
  currentUserId: string;
  type?: 'received' | 'sent';
}

export default function FriendRequests({ currentUserId, type = 'received' }: FriendRequestsProps) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendForm, setSendForm] = useState({
    receiverId: '',
    message: ''
  });
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [type, currentUserId]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const endpoint = type === 'received' 
        ? '/friend-requests/requests/received'
        : '/friend-requests/requests/sent';
      
      const response = await api(endpoint);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      const response = await api(`/friend-requests/requests/${requestId}/accept`, {
        method: 'PUT'
      });

      if (response.ok) {
        // Update request in state
        setRequests(prev => 
          prev.map(req => 
            req.id === requestId 
              ? { ...req, status: 'ACCEPTED' as const }
              : req
          )
        );
        
        // Refresh after a short delay
        setTimeout(fetchRequests, 1000);
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const declineRequest = async (requestId: string) => {
    try {
      const response = await api(`/friend-requests/requests/${requestId}/decline`, {
        method: 'PUT'
      });

      if (response.ok) {
        // Remove declined request from list
        setRequests(prev => prev.filter(req => req.id !== requestId));
      }
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  const sendFriendRequest = async () => {
    if (!sendForm.receiverId.trim()) return;

    try {
      setSendingRequest(true);
      const response = await api('/friend-requests/request', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: sendForm.receiverId,
          message: sendForm.message
        })
      });

      if (response.ok) {
        setShowSendDialog(false);
        setSendForm({ receiverId: '', message: '' });
        if (type === 'sent') {
          fetchRequests();
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request');
    } finally {
      setSendingRequest(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'ACCEPTED':
        return <Badge variant="default" className="text-xs"><UserCheck className="w-3 h-3 mr-1" />Accepted</Badge>;
      case 'DECLINED':
        return <Badge variant="destructive" className="text-xs"><UserX className="w-3 h-3 mr-1" />Declined</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-muted rounded-full"></div>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Friend Requests {type === 'received' ? 'Received' : 'Sent'}
        </h2>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowSendDialog(true)}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Send Request
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">
              No {type === 'received' ? 'incoming' : 'sent'} requests
            </h3>
            <p className="text-muted-foreground mb-4">
              {type === 'received' 
                ? 'You don\'t have any pending friend requests'
                : 'You haven\'t sent any friend requests yet'
              }
            </p>
            {type === 'sent' && (
              <Button onClick={() => setShowSendDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Send First Request
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const user = type === 'received' ? request.sender : request.receiver;
            const timeAgo = formatDistanceToNow(new Date(request.createdAt), { addSuffix: true });

            return (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Link href={`/profile/${user?.id}`}>
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={user?.avatarUrl} />
                        <AvatarFallback>
                          {(user?.displayName || user?.name || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <Link 
                          href={`/profile/${user?.id}`} 
                          className="font-semibold hover:underline"
                        >
                          {user?.displayName || user?.name}
                        </Link>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(request.status)}
                          <span className="text-xs text-muted-foreground">
                            {timeAgo}
                          </span>
                        </div>
                      </div>

                      {request.message && (
                        <p className="text-sm text-muted-foreground mb-3 p-2 bg-muted/50 rounded">
                          "{request.message}"
                        </p>
                      )}

                      {type === 'received' && request.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => acceptRequest(request.id)}
                            className="flex-1"
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => declineRequest(request.id)}
                            className="flex-1"
                          >
                            <UserX className="w-3 h-3 mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}

                      {type === 'sent' && request.status === 'PENDING' && (
                        <p className="text-sm text-muted-foreground">
                          Waiting for response...
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Send Friend Request Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Send Friend Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">User ID</label>
              <input
                type="text"
                value={sendForm.receiverId}
                onChange={(e) => setSendForm(prev => ({ ...prev, receiverId: e.target.value }))}
                placeholder="Enter user ID"
                className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Message (optional)</label>
              <Textarea
                value={sendForm.message}
                onChange={(e) => setSendForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Add a personal message..."
                rows={3}
                className="mt-1"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={sendFriendRequest}
                disabled={!sendForm.receiverId.trim() || sendingRequest}
              >
                {sendingRequest ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}