'use client';

import { useEffect, useState } from 'react';
import MainLayout from '../../components/MainLayout';
import { Users, MessageSquare, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';
import { useRouter } from 'next/navigation';
import CreateRoomDialog from '../../components/CreateRoomDialog';

interface Room {
  id: string;
  name: string;
  description: string | null;
  hostId: string;
  genreId: string | null;
  isLive: boolean;
  createdAt: string;
  updatedAt: string;
  host: { name: string; email: string };
  genre?: { id: string; name: string; description?: string | null };
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
        // Check if user is authenticated first
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No auth token found, redirecting to feed');
          router.push('/feed');
          return;
        }

        console.log('Fetching rooms from API...');
        const res = await api('/rooms');
        console.log('Rooms API response:', res.status, res.statusText);

        if (res.ok) {
          const data = await res.json();
          console.log('Rooms data received:', data);
          setRooms(data);
        } else if (res.status === 401) {
          console.log('Authentication required, redirecting to feed');
          // Redirect to login if not authenticated
          router.push('/feed');
          return;
        } else if (res.status === 403) {
          console.log('Access forbidden - checking response body');
          try {
            const errorBody = await res.clone().json();
            console.log('403 error body:', errorBody);
            if (errorBody.message?.includes('CSRF')) {
              setError('Security token issue. Please refresh the page and try again.');
            } else {
              setError('Access denied. Please check your account permissions.');
            }
          } catch {
            setError('Access denied. Please check your account permissions.');
          }
        } else if (res.status === 500) {
          setError('Server error. The community rooms service may be temporarily unavailable.');
        } else {
          setError(`Unable to load community rooms (${res.status}). Please try again later.`);
        }
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
        if (error instanceof TypeError && error.message.includes('fetch')) {
          setError('Network connection failed. Please check your internet connection.');
        } else {
          setError('An unexpected error occurred. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [router]);

  return (
    <MainLayout>
      <div className="mb-12">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
              <Users className="h-8 w-8 text-secondary" />
              Community Rooms
            </h1>
            <p className="text-muted-foreground">Join active discussion rooms and connect with fellow readers through voice and video chat.</p>
          </div>
          <CreateRoomDialog onRoomCreated={() => window.location.reload()} />
        </div>
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
          <h3 className="text-xl font-semibold mb-2">No Active Community Rooms</h3>
          <p className="text-muted-foreground mb-4">
            There are currently no active discussion rooms. Community rooms are created by administrators and will appear here when available.
            Check back later or explore other parts of the platform.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <CreateRoomDialog onRoomCreated={() => window.location.reload()} />
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button onClick={() => router.push('/feed')}>
              Go to Feed
            </Button>
          </div>
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
    </MainLayout>
  );
}
