'use client';

import { useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  X,
  Upload,
  Video,
  Music2,
  Hash,
  AtSign,
  Globe,
  Users,
  Lock,
  Scissors,
  Layers,
  MessageCircle,
  Loader2
} from 'lucide-react';

interface VideoCreatorProps {
  onClose: () => void;
  onVideoCreated: (video: any) => void;
}

export default function VideoCreator({ onClose, onVideoCreated }: VideoCreatorProps) {
  const [step, setStep] = useState<'upload' | 'edit'>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form state
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE'>('PUBLIC');
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  const [allowComments, setAllowComments] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);

      // Get video duration
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        setVideoDuration(Math.round(video.duration));
      };
      video.src = url;

      setStep('edit');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);

      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        setVideoDuration(Math.round(video.duration));
      };
      video.src = url;

      setStep('edit');
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!videoFile) return;

    setUploading(true);
    try {
      // Step 1: Get Mux direct upload URL
      const uploadUrlResponse = await api('/videos/mux/upload-url', { method: 'POST' });

      if (!uploadUrlResponse.ok) {
        // Fallback to direct upload if Mux is not configured
        const formData = new FormData();
        formData.append('video', videoFile);
        formData.append('caption', caption);
        formData.append('visibility', visibility);
        formData.append('allowDuet', String(allowDuet));
        formData.append('allowStitch', String(allowStitch));
        formData.append('allowComments', String(allowComments));
        formData.append('duration', String(videoDuration));

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/videos/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        if (response.ok) {
          const video = await response.json();
          onVideoCreated(video);
        } else {
          console.error('Upload failed');
        }
        return;
      }

      const { id: uploadId, url: uploadUrl } = await uploadUrlResponse.json();

      // Step 2: Upload directly to Mux
      setUploadProgress(10);
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: videoFile,
        headers: {
          'Content-Type': videoFile.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to Mux');
      }

      setUploadProgress(60);

      // Step 3: Poll for upload completion
      let attempts = 0;
      const maxAttempts = 30;
      let assetReady = false;

      while (attempts < maxAttempts && !assetReady) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusResponse = await api(`/videos/mux/upload-status/${uploadId}`);

        if (statusResponse.ok) {
          const status = await statusResponse.json();
          if (status.status === 'asset_created') {
            assetReady = true;
            setUploadProgress(80);
          } else if (status.status === 'errored') {
            throw new Error('Video processing failed');
          }
        }
        attempts++;
      }

      if (!assetReady) {
        throw new Error('Upload timed out');
      }

      // Step 4: Create video record
      const createResponse = await api('/videos/mux/create', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          caption,
          visibility,
          allowDuet,
          allowStitch,
          allowComments
        })
      });

      if (createResponse.ok) {
        const video = await createResponse.json();
        setUploadProgress(100);
        onVideoCreated(video);
      } else {
        throw new Error('Failed to create video record');
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-6 h-6 text-white" />
        </Button>
        <span className="text-white font-semibold">
          {step === 'upload' ? 'Upload Video' : 'Post'}
        </span>
        {step === 'edit' ? (
          <Button
            size="sm"
            className="bg-pink-500 hover:bg-pink-600"
            disabled={uploading}
            onClick={handleUpload}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Post'
            )}
          </Button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {step === 'upload' ? (
        /* Upload Step */
        <div
          className="flex-1 flex items-center justify-center p-8"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="text-center">
            <div
              className="w-64 h-64 border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Video className="w-16 h-16 text-zinc-500 mb-4" />
              <p className="text-white font-medium mb-2">
                Select video to upload
              </p>
              <p className="text-zinc-500 text-sm mb-4">
                Or drag and drop a file
              </p>
              <p className="text-zinc-600 text-xs">
                MP4, WebM, or MOV
              </p>
              <p className="text-zinc-600 text-xs">
                Up to 10 minutes
              </p>
            </div>

            <Button
              className="mt-6 bg-pink-500 hover:bg-pink-600"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Select file
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>
      ) : (
        /* Edit Step */
        <div className="flex-1 flex overflow-hidden">
          {/* Video Preview */}
          <div className="flex-1 bg-zinc-950 flex items-center justify-center p-4">
            {videoPreview && (
              <div className="relative max-h-full aspect-[9/16] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoPreview}
                  className="w-full h-full object-contain"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-white text-xs">
                  {formatDuration(videoDuration)}
                </div>
              </div>
            )}
          </div>

          {/* Edit Form */}
          <div className="w-96 bg-zinc-900 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Caption */}
              <div>
                <Label className="text-white mb-2 block">Caption</Label>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption... use #hashtags and @mentions"
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                  maxLength={2200}
                />
                <div className="flex justify-between mt-2">
                  <div className="flex gap-2">
                    <button
                      className="text-zinc-400 hover:text-white"
                      onClick={() => setCaption(prev => prev + ' #')}
                    >
                      <Hash className="w-5 h-5" />
                    </button>
                    <button
                      className="text-zinc-400 hover:text-white"
                      onClick={() => setCaption(prev => prev + ' @')}
                    >
                      <AtSign className="w-5 h-5" />
                    </button>
                  </div>
                  <span className="text-zinc-500 text-sm">
                    {caption.length}/2200
                  </span>
                </div>
              </div>

              {/* Visibility */}
              <div>
                <Label className="text-white mb-2 block">Who can view this video</Label>
                <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Everyone
                      </div>
                    </SelectItem>
                    <SelectItem value="FOLLOWERS_ONLY">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Followers
                      </div>
                    </SelectItem>
                    <SelectItem value="PRIVATE">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Only me
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-zinc-400" />
                    <Label className="text-white">Allow Duet</Label>
                  </div>
                  <Switch
                    checked={allowDuet}
                    onCheckedChange={setAllowDuet}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-zinc-400" />
                    <Label className="text-white">Allow Stitch</Label>
                  </div>
                  <Switch
                    checked={allowStitch}
                    onCheckedChange={setAllowStitch}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-zinc-400" />
                    <Label className="text-white">Allow Comments</Label>
                  </div>
                  <Switch
                    checked={allowComments}
                    onCheckedChange={setAllowComments}
                  />
                </div>
              </div>

              {/* Sound Selection */}
              <div>
                <Label className="text-white mb-2 block">Sound</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-zinc-800 border-zinc-700 text-zinc-400"
                >
                  <Music2 className="w-4 h-4 mr-2" />
                  Add a sound (optional)
                </Button>
              </div>

              {/* Change video button */}
              <Button
                variant="outline"
                className="w-full bg-zinc-800 border-zinc-700 text-white"
                onClick={() => {
                  setStep('upload');
                  setVideoFile(null);
                  setVideoPreview(null);
                }}
              >
                Change video
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
