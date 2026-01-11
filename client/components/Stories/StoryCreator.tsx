'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Image as ImageIcon, Type, Loader2 } from 'lucide-react';
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
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#3b82f6');
  const [isCreating, setIsCreating] = useState(false);

  const canCreate = mode === 'text' ? text.trim().length > 0 : imageUrl.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;

    setIsCreating(true);
    try {
      const response = await api('/stories', {
        method: 'POST',
        body: JSON.stringify({
          text: mode === 'text' ? text.trim() : undefined,
          imageUrl: mode === 'image' ? imageUrl.trim() : undefined,
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
            variant={mode === 'image' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('image')}
            className="flex-1"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Image
          </Button>
        </div>

        {/* Preview */}
        <div
          className="aspect-[9/16] max-h-[300px] mx-4 mt-4 rounded-lg flex items-center justify-center overflow-hidden"
          style={{ backgroundColor }}
        >
          {mode === 'text' ? (
            <p className="text-white text-lg font-medium text-center p-6 leading-relaxed">
              {text || 'Your story text...'}
            </p>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-full object-contain"
              onError={() => setImageUrl('')}
            />
          ) : (
            <p className="text-white/50">Enter image URL below</p>
          )}
        </div>

        {/* Input */}
        <div className="p-4 space-y-4">
          {mode === 'text' ? (
            <Textarea
              placeholder="What's on your mind? (max 280 characters)"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 280))}
              className="resize-none"
              rows={3}
            />
          ) : (
            <Input
              type="url"
              placeholder="Enter image URL..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          )}

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
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate || isCreating} className="flex-1">
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
