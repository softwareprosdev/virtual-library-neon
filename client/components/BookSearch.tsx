'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Book, Loader2, Star, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { searchBooks, GoogleBook } from '@/lib/googleBooks';

interface BookSearchProps {
    onBookSelect?: (book: GoogleBook) => void;
    placeholder?: string;
    showAllResults?: boolean;
}

export default function BookSearch({
    onBookSelect,
    placeholder = 'Search for books...',
    showAllResults = true,
}: BookSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GoogleBook[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalResults, setTotalResults] = useState(0);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        try {
            const data = await searchBooks(query, {
                maxResults: showAllResults ? 20 : 5,
            });
            setResults(data.items);
            setTotalResults(data.totalItems);
        } catch (error) {
            console.error('Error searching books:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="space-y-4">
            {/* Search Input */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={placeholder}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="pl-10"
                    />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        'Search'
                    )}
                </Button>
            </div>

            {/* Results Count */}
            {totalResults > 0 && (
                <p className="text-sm text-muted-foreground">
                    Found {totalResults.toLocaleString()} results
                </p>
            )}

            {/* Results Grid */}
            {results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {results.map((book) => (
                        <Card
                            key={book.id}
                            className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden group"
                            onClick={() => onBookSelect?.(book)}
                        >
                            <div className="aspect-[3/4] relative bg-secondary/30">
                                {book.volumeInfo.imageLinks?.thumbnail ? (
                                    <Image
                                        src={book.volumeInfo.imageLinks.thumbnail.replace(
                                            'http://',
                                            'https://'
                                        )}
                                        alt={book.volumeInfo.title}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <Book className="w-12 h-12 text-muted-foreground/30" />
                                    </div>
                                )}
                                {book.volumeInfo.averageRating && (
                                    <Badge className="absolute top-2 right-2 bg-primary/90">
                                        <Star className="w-3 h-3 mr-1 fill-current" />
                                        {book.volumeInfo.averageRating.toFixed(1)}
                                    </Badge>
                                )}
                            </div>
                            <CardContent className="p-3">
                                <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                                    {book.volumeInfo.title}
                                </h3>
                                {book.volumeInfo.authors && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                        {book.volumeInfo.authors.join(', ')}
                                    </p>
                                )}
                                {book.volumeInfo.publishedDate && (
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(
                                            book.volumeInfo.publishedDate
                                        ).getFullYear()}
                                    </p>
                                )}
                                {book.volumeInfo.categories && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {book.volumeInfo.categories.slice(0, 2).map((cat) => (
                                            <Badge
                                                key={cat}
                                                variant="outline"
                                                className="text-xs"
                                            >
                                                {cat}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && query && results.length === 0 && (
                <div className="text-center py-12">
                    <Book className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">No books found</h3>
                    <p className="text-muted-foreground">
                        Try a different search term
                    </p>
                </div>
            )}
        </div>
    );
}
