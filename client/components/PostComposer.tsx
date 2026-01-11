'use client';

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Image as ImageIcon,
  BookOpen,
  Send,
  X,
  Loader2,
  Smile,
  Hash
} from 'lucide-react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';

interface PostComposerProps {
  onPostCreated?: () => void;
}

const MAX_CHARS = 500;

export default function PostComposer({ onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const user = getUser();
  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canPost = content.trim().length > 0 && !isOverLimit && !isPosting;

  const handlePost = async () => {
    if (!canPost) return;

    setIsPosting(true);
    try {
      const response = await api('/posts', {
        method: 'POST',
        body: JSON.stringify({
          content: content.trim(),
          imageUrl: imageUrl.trim() || undefined
        })
      });

      if (response.ok) {
        setContent('');
        setImageUrl('');
        setShowImageInput(false);
        onPostCreated?.();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const insertHashtag = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + '#' + content.substring(end);
    setContent(newContent);

    // Move cursor after the hashtag
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      textarea.focus();
    }, 0);
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={undefined} />
            <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <Textarea
              ref={textareaRef}
              placeholder="What's on your mind? Share a thought, quote, or update..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none border-0 focus-visible:ring-0 p-0 text-base"
              disabled={isPosting}
            />

            {/* Image URL input */}
            {showImageInput && (
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="Enter image URL..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border rounded-md"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowImageInput(false);
                    setImageUrl('');
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Image preview */}
            {imageUrl && (
              <div className="relative inline-block">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="max-h-40 rounded-lg"
                  onError={() => setImageUrl('')}
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-1 right-1 w-6 h-6"
                  onClick={() => setImageUrl('')}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className="text-muted-foreground hover:text-primary"
                >
                  <ImageIcon className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={insertHashtag}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Hash className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {charCount}/{MAX_CHARS}
                </span>
                <Button
                  size="sm"
                  onClick={handlePost}
                  disabled={!canPost}
                >
                  {isPosting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
