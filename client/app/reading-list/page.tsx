'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { api } from '../../lib/api';
import MainLayout from '../../components/MainLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { BookOpen, Check, Clock, Bookmark, Star, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

interface ReadingEntry {
  id: string;
  googleId: string;
  title: string;
  author: string;
  coverUrl: string;
  status: 'WANT_TO_READ' | 'READING' | 'FINISHED' | 'ABANDONED';
  rating: number;
  updatedAt: string;
}

export default function ReadingListPage() {
  const [entries, setEntries] = useState<ReadingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    try {
      const res = await api('/reading-list');
      if (res.ok) {
        setEntries(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (googleId: string) => {
    if(!confirm("Remove this book from your tracking list?")) return;
    try {
        await api(`/reading-list/${googleId}`, { method: 'DELETE' });
        setEntries(entries.filter(e => e.googleId !== googleId));
    } catch (error) {
        console.error('Failed to delete entry:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'WANT_TO_READ': return <Clock className="h-4 w-4 text-blue-400" />;
      case 'READING': return <BookOpen className="h-4 w-4 text-yellow-400" />;
      case 'FINISHED': return <Check className="h-4 w-4 text-green-400" />;
      case 'ABANDONED': return <span className="text-destructive">×</span>;
      default: return <Bookmark className="h-4 w-4" />;
    }
  };

  const filterEntries = (status: string) => {
    if (status === 'ALL') return entries;
    return entries.filter(e => e.status === status);
  };

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
          <Bookmark className="h-8 w-8 text-primary" />
          READING_LOG
        </h1>
        <p className="text-muted-foreground">Track your literary journey across the digital expanse.</p>
      </div>

      <Tabs defaultValue="ALL" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px] mb-8">
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="READING">Reading</TabsTrigger>
          <TabsTrigger value="WANT_TO_READ">Plan</TabsTrigger>
          <TabsTrigger value="FINISHED">Done</TabsTrigger>
        </TabsList>

        {['ALL', 'READING', 'WANT_TO_READ', 'FINISHED'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[1,2,3,4].map(i => <div key={i} className="h-[300px] bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : filterEntries(tab).length === 0 ? (
              <div className="text-center py-20 border border-dashed border-muted rounded-lg">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">No Data Found</h3>
                <p className="text-muted-foreground">Start tracking books from the dashboard.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {filterEntries(tab).map((entry) => (
                  <Card key={entry.id} className="group relative overflow-hidden border-transparent hover:border-primary/50 transition-all hover:shadow-[0_0_20px_rgba(var(--primary),0.1)]">
                    <div className="aspect-[2/3] w-full bg-black relative">
                      {entry.coverUrl ? (
                        <Image src={entry.coverUrl} alt={entry.title} fill className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" sizes="(max-width: 640px) 50vw, 200px" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">No Cover</div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="backdrop-blur-md bg-black/50 border border-white/10">
                            {getStatusIcon(entry.status)}
                        </Badge>
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                        <Button variant="destructive" size="icon" className="rounded-full" onClick={() => handleDelete(entry.googleId)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-bold truncate text-sm mb-1" title={entry.title}>{entry.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">{entry.author}</p>
                      {entry.status === 'FINISHED' && (
                         <div className="flex gap-0.5 mt-2">
                            {[1,2,3,4,5].map(star => (
                                <Star key={star} size={12} className={star <= (entry.rating || 0) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"} />
                            ))}
                         </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </MainLayout>
  );
}
