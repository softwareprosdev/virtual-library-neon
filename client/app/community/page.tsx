'use client';

import { useEffect, useState } from 'react';
import MainLayout from '../../components/MainLayout';
import { Users, MessageSquare, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';
import { useRouter } from 'next/navigation';

interface Room {
  id: string;
  name: string;
  description: string;
  host: { name: string };
  genre?: { name: string };
  _count: { messages: number; participants: number };
}

export default function CommunityPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api('/rooms');
        if (res.ok) {
          const data = await res.json();
          setRooms(data);
        } else if (res.status === 401) {
          // Redirect to login if not authenticated
          router.push('/feed');
          return;
        } else {
          setError('Failed to load community rooms');
        }
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
        setError('Connection error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [router]);

  return (
    <MainLayout>
      <div className="mb-12">
        <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
          <Users className="h-8 w-8 text-secondary" />
          COMMUNITY_HUBS
        </h1>
        <p className="text-muted-foreground">Join active neural links and discuss your favorite reads.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Unable to load community rooms</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No active community rooms</h3>
          <p className="text-muted-foreground">Be the first to create a discussion room!</p>
          <Button className="mt-4" onClick={() => router.push('/dashboard')}>
            Create Room
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map(room => (
                <Card key={room.id} className="group relative overflow-hidden border-border hover:border-secondary transition-all hover:shadow-[0_0_20px_rgba(var(--secondary),0.1)]">
                    <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                            {room.genre && (
                                <Badge variant="outline" className="border-secondary/50 text-secondary">
                                    {room.genre.name}
                                </Badge>
                            )}
                            <div className="flex items-center text-xs text-muted-foreground gap-2">
                                <span className="flex items-center gap-1"><Users size={12}/> {room._count.participants}</span>
                                <span className="flex items-center gap-1"><MessageSquare size={12}/> {room._count.messages}</span>
                            </div>
                        </div>
                        <CardTitle className="text-xl group-hover:text-secondary transition-colors">{room.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{room.description}</p>
                        <p className="text-xs text-muted-foreground mb-4">Host: <span className="text-foreground font-bold">{room.host.name}</span></p>
                        
                        <Button className="w-full gap-2" onClick={() => router.push(`/room/${room.id}`)}>
                            Join Channel <ExternalLink size={16} />
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}
                        <Button className="w-full gap-2" onClick={() => router.push(`/room/${room.id}`)}>
                            Join Channel <ExternalLink size={16} />
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}
    </MainLayout>
  );
}
