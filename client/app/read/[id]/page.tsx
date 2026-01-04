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
            // Since we don't have a single book endpoint yet, we fetch all and find (not efficient but MVP)
            // Or better, we trust the URL construction. 
            // Actually, we should fetch book details.
            // Let's implement a quick fetch.
            api('/books').then(async (res) => {
                if(res.ok) {
                    const books = await res.json();
                    // Handle potential string ID vs number ID issues
                    const found = books.find((b: Book) => String(b.id) === String(id));
                    if(found) setBook(found);
                }
            });
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

    const fullUrl = book.fileUrl.startsWith('http') 
        ? book.fileUrl 
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${book.fileUrl}`;

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
