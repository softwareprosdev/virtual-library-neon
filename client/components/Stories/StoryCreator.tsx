import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Image as ImageIcon, Type, Loader2, Upload } from 'lucide-react';
import { api } from '@/lib/api';

interface StoryCreatorProps {
  onClose: () => void;
  onCreated: () => void;
}

const BACKGROUND_COLORS = [
  '#1a1a1a',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#10b981',
  '#06b6d4',
  '#f59e0b',
  '#ef4444',
  '#6366f1',
];

export default function StoryCreator({ onClose, onCreated }: StoryCreatorProps) {
  const [mode, setMode] = useState<'text' | 'image' | 'video'>('text');
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [backgroundColor, setBackgroundColor] = useState('#3b82f6');
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canCreate = mode === 'text' ? text.trim().length > 0 : mediaUrl.trim().length > 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    setIsUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('media', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/stories/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setMediaUrl(data.url);
        setMediaType(data.type);
        setMode(data.type); // Switch mode to image/video automatically
      } else {
        alert('Failed to upload media');
      }
    } catch (error) {
      console.error('Media upload error:', error);
      alert('Error uploading media');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!canCreate) return;

    setIsCreating(true);
    try {
      const response = await api('/stories', {
        method: 'POST',
        body: JSON.stringify({
          text: mode === 'text' ? text.trim() : undefined,
          mediaUrl: mode !== 'text' ? mediaUrl.trim() : undefined,
          mediaType: mode !== 'text' ? mediaType : undefined,
          backgroundColor,
        }),
      });

      if (response.ok) {
        onCreated();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create story');
      }
    } catch (error) {
      console.error('Error creating story:', error);
      alert('Failed to create story');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">Create Story</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 p-4 border-b">
          <Button
            variant={mode === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('text')}
            className="flex-1"
          >
            <Type className="w-4 h-4 mr-2" />
            Text
          </Button>
          <Button
            variant={mode === 'image' || mode === 'video' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('image')}
            className="flex-1"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Media
          </Button>
        </div>

        {/* Preview */}
        <div
          className="aspect-[9/16] max-h-[300px] mx-4 mt-4 rounded-lg flex items-center justify-center overflow-hidden bg-black"
          style={{ backgroundColor: mode === 'text' ? backgroundColor : '#000' }}
        >
          {mode === 'text' ? (
            <p className="text-white text-lg font-medium text-center p-6 leading-relaxed">
              {text || 'Your story text...'}
            </p>
          ) : mediaUrl ? (
            mediaType === 'video' ? (
              <video src={mediaUrl} controls className="w-full h-full object-contain" />
            ) : (
              <img
                src={mediaUrl}
                alt="Preview"
                className="w-full h-full object-contain"
                onError={() => setMediaUrl('')}
              />
            )
          ) : (
            <div className="text-center">
              <p className="text-white/50 mb-4">Upload a photo or video</p>
              <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload Media
              </Button>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,video/*"
            onChange={handleFileUpload}
          />

          {mode === 'text' ? (
            <>
              <Textarea
                placeholder="What's on your mind? (max 280 characters)"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 280))}
                className="resize-none"
                rows={3}
              />
              {/* Background Colors */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Background Color</p>
                <div className="flex flex-wrap gap-2">
                  {BACKGROUND_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        backgroundColor === color
                          ? 'border-white scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setBackgroundColor(color)}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="Or enter media URL..."
                  value={mediaUrl}
                  onChange={(e) => {
                    setMediaUrl(e.target.value);
                    // Basic check for video extension
                    if (e.target.value.match(/\.(mp4|webm|mov)$/i)) {
                      setMediaType('video');
                    } else {
                      setMediaType('image');
                    }
                  }}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate || isCreating || isUploading} className="flex-1">
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Share Story'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
