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
    fileUrl: string;
}

export default function ReadPage() {
    const { id } = useParams();
    const router = useRouter();
    const [book, setBook] = useState<Book | null>(null);

    useEffect(() => {
        if (id) {
            const fetchBook = async () => {
                try {
                    // Try single book endpoint first
                    let res = await api(`/books/${id}`);
                    
                    if (!res.ok) {
                        // Fallback to fetching all books
                        res = await api('/books');
                        if (res.ok) {
                            const books = await res.json();
                            const found = books.find((b: Book) => String(b.id) === String(id));
                            if(found) setBook(found);
                        }
                    } else {
                        const book = await res.json();
                        setBook(book);
                    }
                } catch (error) {
                    console.error('Failed to fetch book:', error);
                }
            };
            
            fetchBook();
        }
    }, [id]);

    if (!book) return (
        <MainLayout>
            <div className="flex justify-center mt-10">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading Module...</span>
                </div>
            </div>
        </MainLayout>
    );

    if (!book.fileUrl) {
        return (
            <MainLayout>
                <div className="flex justify-center mt-10">
                    <div className="text-center">
                        <h2 className="text-xl font-bold mb-2">Book Not Available</h2>
                        <p className="text-muted-foreground">This book's file is not accessible.</p>
                        <Button onClick={() => router.back()} className="mt-4">
                            Go Back
                        </Button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const fullUrl = book.fileUrl.startsWith('http') 
        ? book.fileUrl 
        : `${baseUrl}${book.fileUrl.startsWith('/') ? '' : '/'}${book.fileUrl}`;

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
