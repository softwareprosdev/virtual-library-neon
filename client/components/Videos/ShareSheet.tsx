'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  X,
  Link2,
  Twitter,
  Facebook,
  MessageCircle,
  Mail,
  Copy,
  Check
} from 'lucide-react';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (platform?: string) => void;
  videoUrl: string;
}

export default function ShareSheet({
  isOpen,
  onClose,
  onShare,
  videoUrl
}: ShareSheetProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareOptions = [
    {
      name: 'Copy Link',
      icon: Link2,
      action: async () => {
        await navigator.clipboard.writeText(videoUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onShare('copy');
      },
      color: 'bg-zinc-700'
    },
    {
      name: 'Twitter',
      icon: Twitter,
      action: () => {
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(videoUrl)}`,
          '_blank'
        );
        onShare('twitter');
      },
      color: 'bg-blue-500'
    },
    {
      name: 'Facebook',
      icon: Facebook,
      action: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(videoUrl)}`,
          '_blank'
        );
        onShare('facebook');
      },
      color: 'bg-blue-600'
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      action: () => {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(videoUrl)}`,
          '_blank'
        );
        onShare('whatsapp');
      },
      color: 'bg-green-500'
    },
    {
      name: 'Email',
      icon: Mail,
      action: () => {
        window.open(
          `mailto:?subject=Check out this video&body=${encodeURIComponent(videoUrl)}`,
          '_blank'
        );
        onShare('email');
      },
      color: 'bg-orange-500'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg bg-zinc-900 rounded-t-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-white font-semibold text-lg">Share to</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-white" />
          </Button>
        </div>

        {/* Share options */}
        <div className="grid grid-cols-5 gap-4">
          {shareOptions.map((option) => (
            <button
              key={option.name}
              className="flex flex-col items-center gap-2"
              onClick={option.action}
            >
              <div className={`p-4 rounded-full ${option.color}`}>
                {option.name === 'Copy Link' && copied ? (
                  <Check className="w-6 h-6 text-white" />
                ) : (
                  <option.icon className="w-6 h-6 text-white" />
                )}
              </div>
              <span className="text-white text-xs text-center">
                {option.name === 'Copy Link' && copied ? 'Copied!' : option.name}
              </span>
            </button>
          ))}
        </div>

        {/* URL preview */}
        <div className="mt-6 p-3 bg-zinc-800 rounded-lg flex items-center gap-2">
          <Link2 className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <span className="text-zinc-400 text-sm truncate">{videoUrl}</span>
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0"
            onClick={async () => {
              await navigator.clipboard.writeText(videoUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>

        {/* Extra actions */}
        <div className="mt-6 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-zinc-800"
          >
            Send to friends
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-zinc-800"
          >
            Add to Story
          </Button>
        </div>
      </div>
    </div>
  );
}
