'use client';

import { useState } from 'react';
import MainLayout from '../../components/MainLayout';
import { Book, Compass, Search } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const POPULAR_CATEGORIES = [
  { id: 'fiction', name: 'Fiction', icon: '📖' },
  { id: 'science-fiction', name: 'Science Fiction', icon: '🚀' },
  { id: 'fantasy', name: 'Fantasy', icon: '🐉' },
  { id: 'mystery', name: 'Mystery', icon: '🔍' },
  { id: 'thriller', name: 'Thriller', icon: '😱' },
  { id: 'romance', name: 'Romance', icon: '💕' },
  { id: 'horror', name: 'Horror', icon: '👻' },
  { id: 'biography', name: 'Biography', icon: '👤' },
  { id: 'history', name: 'History', icon: '🏛️' },
  { id: 'philosophy', name: 'Philosophy', icon: '🤔' },
  { id: 'psychology', name: 'Psychology', icon: '🧠' },
  { id: 'self-help', name: 'Self Help', icon: '💪' },
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'technology', name: 'Technology', icon: '💻' },
  { id: 'poetry', name: 'Poetry', icon: '✒️' },
  { id: 'comics', name: 'Comics & Manga', icon: '🎨' },
  { id: 'young-adult', name: 'Young Adult', icon: '🌟' },
  { id: 'classics', name: 'Classics', icon: '📜' },
  { id: 'erotica', name: 'Erotica', icon: '💋' },
  { id: 'dark-romance', name: 'Dark Romance', icon: '🥀' },
  { id: 'lgbtq', name: 'LGBTQ+', icon: '🏳️‍🌈' },
  { id: 'adult-fiction', name: 'Adult Fiction', icon: '🔞' },
];

export default function BrowsePage() {
  const [search, setSearch] = useState('');

  return (
    <MainLayout>
      <div className="mb-12">
        <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
          <Compass className="h-8 w-8 text-primary" />
          EXPLORE_ARCHIVES
        </h1>
        <p className="text-muted-foreground mb-8">Dive into the vast data streams of literary content.</p>

        <div className="relative max-w-xl mb-12">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input 
                className="pl-10 py-6 text-lg bg-card/50 backdrop-blur" 
                placeholder="Search for titles, authors, or ISBNs..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {POPULAR_CATEGORIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map((category) => (
                <Card key={category.id} className="group cursor-pointer hover:border-primary transition-all hover:shadow-[0_0_15px_rgba(var(--primary),0.3)] bg-card/50">
                    <CardContent className="flex flex-col items-center justify-center p-6 h-40">
                        <span className="text-4xl mb-3 transform group-hover:scale-110 transition-transform">{category.icon}</span>
                        <span className="font-bold text-center text-sm">{category.name}</span>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </MainLayout>
  );
}
