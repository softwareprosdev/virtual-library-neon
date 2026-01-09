'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '@/components/ui/progress';
import { Zap } from 'lucide-react';

interface UserStats {
  points: number;
  level: number;
  levelTitle: string;
  progress: number;
  nextLevelXp: number;
  badges: Array<{ id: string; name: string; iconUrl: string; description: string }>;
  social: { following: number; followers: number };
}

export default function UserStatsCard() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api('/gamification/me');
        if (res.ok) {
          setStats(await res.json());
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div className="h-48 bg-muted animate-pulse rounded-lg" />;
  if (!stats) return null;

  return (
    <Card className="border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.15)] bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Identify</h3>
            <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              <Zap className="h-5 w-5 fill-primary" />
              {stats.levelTitle}
            </CardTitle>
          </div>
          <div className="text-right">
            <span className="text-4xl font-black text-foreground">{stats.level}</span>
            <span className="text-xs text-muted-foreground block">LEVEL</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-primary font-mono">XP: {stats.points}</span>
            <span className="text-muted-foreground font-mono">NEXT: {stats.nextLevelXp}</span>
          </div>
          <Progress value={stats.progress} className="h-2 bg-secondary/20" />
        </div>

        {stats.badges.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {stats.badges.map((badge) => (
              <div key={badge.id} className="group relative flex flex-col items-center justify-center p-2 rounded bg-muted/50 border border-transparent hover:border-primary/50 transition-all cursor-help">
                <span className="text-2xl">{badge.iconUrl}</span>
                <span className="text-[10px] font-bold mt-1 text-center line-clamp-1">{badge.name}</span>
                
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded border border-border w-32 text-center z-10 shadow-lg">
                  {badge.description}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground bg-muted/20 rounded border border-dashed border-muted">
            No badges initialized yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
