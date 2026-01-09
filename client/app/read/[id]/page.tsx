'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import MainLayout from '../../../components/MainLayout';
import BookReader3D from '../../../components/BookReader3D';
import { Button } from '../../../components/ui/button';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Book {
    id: string;
    title: string;
    fileUrl: string | null;
}

export default function ReadPage() {
    const params = useParams();
    const idParam = params?.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    const router = useRouter();
    const [book, setBook] = useState<Book | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        let cancelled = false;

        const fetchBook = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Try single book endpoint first
                let res = await api(`/books/${encodeURIComponent(id)}`);

                if (!res.ok) {
                    // Fallback to fetching all books
                    res = await api('/books');
                    if (res.ok) {
                        const books = await res.json();
                        const found = books.find((b: Book) => String(b.id) === String(id));
                        if (!cancelled) {
                            if (found) setBook(found);
                            else setError('Book not found');
                        }
                    } else if (!cancelled) {
                        setError('Failed to load book');
                    }
                } else {
                    const loadedBook = await res.json();
                    if (!cancelled) setBook(loadedBook);
                }
            } catch (err) {
                console.error('Failed to fetch book:', err);
                if (!cancelled) setError('Failed to fetch book');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        fetchBook();
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (!id) {
        return (
            <MainLayout>
                <div className="flex justify-center mt-10">
                    <div className="text-center">
                        <h2 className="text-xl font-bold mb-2">Invalid Book</h2>
                        <p className="text-muted-foreground">Missing book id.</p>
                        <Button onClick={() => router.push('/browse')} className="mt-4">
                            Go to Browse
                        </Button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (isLoading && !book) return (
        <MainLayout>
            <div className="flex justify-center mt-10">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading Module...</span>
                </div>
            </div>
        </MainLayout>
    );

    if (error) {
        return (
            <MainLayout>
                <div className="flex justify-center mt-10">
                    <div className="text-center">
                        <h2 className="text-xl font-bold mb-2">Unable to Open Book</h2>
                        <p className="text-muted-foreground">{error}</p>
                        <Button onClick={() => router.back()} className="mt-4" variant="outline">
                            Go Back
                        </Button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!book) {
        return (
            <MainLayout>
                <div className="flex justify-center mt-10">
                    <div className="text-center">
                        <h2 className="text-xl font-bold mb-2">Book Not Found</h2>
                        <p className="text-muted-foreground">This book may have been deleted or you may not have access.</p>
                        <Button onClick={() => router.push('/browse')} className="mt-4">
                            Go to Browse
                        </Button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!book.fileUrl) {
        return (
            <MainLayout>
                <div className="flex justify-center mt-10">
                    <div className="text-center">
                        <h2 className="text-xl font-bold mb-2">Book Not Available</h2>
                        <p className="text-muted-foreground">This book&apos;s file is not accessible.</p>
                        <Button onClick={() => router.back()} className="mt-4">
                            Go Back
                        </Button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const apiBase = rawApiUrl.replace(/\/+$/, '').replace(/\/api$/, '');
    const fullUrl = book.fileUrl.startsWith('http')
        ? book.fileUrl
        : `${apiBase}${book.fileUrl.startsWith('/') ? '' : '/'}${book.fileUrl}`;

    return (
        <MainLayout>
            <div className="p-4 border-b mb-4 flex justify-between items-center bg-background">
                <h1 className="text-xl font-bold text-primary">
                    READING: {book.title}
                </h1>
                <Button onClick={() => router.back()} variant="outline" size="sm">
                    Close Archive
                </Button>
            </div>
            <BookReader3D url={fullUrl} />
        </MainLayout>
    );
}
