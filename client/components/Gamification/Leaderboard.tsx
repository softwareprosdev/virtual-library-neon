'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Trophy, Medal, Crown } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { cn } from '../../lib/utils';

interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
  level: number;
  title: string;
  badges: Array<{ iconUrl: string }>;
}

export default function Leaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api('/gamification/leaderboard');
        if (res.ok) {
          setUsers(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) return <div className="h-48 bg-muted animate-pulse rounded-lg" />;

  return (
    <Card className="border-secondary/50 shadow-[0_0_15px_rgba(var(--secondary),0.15)] bg-card/80 backdrop-blur-sm h-full">
      <CardHeader className="pb-4 border-b border-border/50">
        <CardTitle className="text-xl font-bold text-secondary flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          TOP_OPERATIVES
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {users.map((user, index) => (
            <div key={user.id} className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors">
              <div className={cn(
                "w-8 h-8 flex items-center justify-center font-bold rounded-full text-sm",
                index === 0 ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500" :
                index === 1 ? "bg-slate-400/20 text-slate-400 border border-slate-400" :
                index === 2 ? "bg-amber-700/20 text-amber-700 border border-amber-700" :
                "text-muted-foreground"
              )}>
                {index <= 2 ? <Crown size={14} /> : index + 1}
              </div>
              
              <Avatar className="h-8 w-8 border border-primary/30">
                <AvatarFallback className="text-xs bg-secondary/10 text-secondary">
                  {user.name?.substring(0, 2).toUpperCase() || 'UN'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold truncate text-foreground">{user.name || 'Unknown User'}</p>
                  {user.badges.length > 0 && (
                    <span className="text-xs opacity-70" title="Top Badge">{user.badges[0].iconUrl}</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{user.title}</p>
              </div>

              <div className="text-right">
                <span className="block text-sm font-mono text-primary font-bold">{user.points} XP</span>
                <span className="block text-[10px] text-muted-foreground">LVL {user.level}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
