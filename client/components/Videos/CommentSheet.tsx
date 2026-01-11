'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Heart, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  likes: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    displayName?: string;
    avatarUrl?: string;
  };
  replies?: Comment[];
  _count?: {
    replies: number;
  };
}

interface CommentSheetProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
  allowComments: boolean;
}

export default function CommentSheet({
  videoId,
  isOpen,
  onClose,
  allowComments
}: CommentSheetProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentUser = getUser();

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, videoId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await api(`/videos/${videoId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const response = await api(`/videos/${videoId}/comment`, {
        method: 'POST',
        body: JSON.stringify({
          content: newComment,
          parentId: replyTo?.id
        })
      });

      if (response.ok) {
        const comment = await response.json();
        if (replyTo) {
          // Add as reply
          setComments(prev => prev.map(c => {
            if (c.id === replyTo.id) {
              return {
                ...c,
                replies: [...(c.replies || []), comment],
                _count: { replies: (c._count?.replies || 0) + 1 }
              };
            }
            return c;
          }));
        } else {
          // Add as new comment
          setComments(prev => [comment, ...prev]);
        }
        setNewComment('');
        setReplyTo(null);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyTo(comment);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg h-[60vh] bg-zinc-900 rounded-t-3xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <span className="text-white font-semibold">
            {comments.length} comments
          </span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-white" />
          </Button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-zinc-400">
              <p>No comments yet</p>
              <p className="text-sm mt-1">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                {/* Main comment */}
                <div className="flex gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={comment.user.avatarUrl} />
                    <AvatarFallback>
                      {(comment.user.displayName || comment.user.name).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">
                        {comment.user.displayName || comment.user.name}
                      </span>
                      <span className="text-zinc-500 text-xs">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-white text-sm mt-1">{comment.content}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <button className="text-zinc-400 text-xs flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {comment.likes || 0}
                      </button>
                      <button
                        className="text-zinc-400 text-xs"
                        onClick={() => handleReply(comment)}
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-12 space-y-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={reply.user.avatarUrl} />
                          <AvatarFallback>
                            {(reply.user.displayName || reply.user.name).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium text-xs">
                              {reply.user.displayName || reply.user.name}
                            </span>
                            <span className="text-zinc-500 text-xs">
                              {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-white text-sm mt-1">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Show more replies */}
                {comment._count && comment._count.replies > (comment.replies?.length || 0) && (
                  <button className="ml-12 text-zinc-400 text-xs flex items-center gap-1">
                    <ChevronDown className="w-4 h-4" />
                    View {comment._count.replies - (comment.replies?.length || 0)} more replies
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input */}
        {allowComments ? (
          <div className="p-4 border-t border-zinc-800">
            {replyTo && (
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-zinc-400">
                  Replying to @{replyTo.user.displayName || replyTo.user.name}
                </span>
                <button
                  className="text-zinc-400"
                  onClick={() => setReplyTo(null)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser?.avatarUrl} />
                <AvatarFallback>
                  {(currentUser?.displayName || currentUser?.name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Input
                ref={inputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-zinc-800 border-none text-white placeholder:text-zinc-500"
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              />
              <Button
                size="icon"
                variant="ghost"
                disabled={!newComment.trim() || submitting}
                onClick={submitComment}
              >
                <Send className="w-5 h-5 text-pink-500" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-zinc-800 text-center text-zinc-400 text-sm">
            Comments are turned off for this video
          </div>
        )}
      </div>
    </div>
  );
}
