'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import MainLayout from '../../../components/MainLayout';
import BookReader3D from '../../../components/BookReader3D';
import { Box, Typography, Button } from '@mui/material';

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
                    const found = books.find((b: any) => b.id === id);
                    if(found) setBook(found);
                }
            });
        }
    }, [id]);

    if (!book) return (
        <MainLayout>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
                <Typography color="white">Loading Module...</Typography>
            </Box>
        </MainLayout>
    );

    const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${book.fileUrl}`;

    return (
        <MainLayout>
            <Box sx={{ p: 2, borderBottom: '1px solid #333', mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" className="neon-text" sx={{ color: 'white' }}>
                    READING: {book.title}
                </Typography>
                <Button onClick={() => router.back()} variant="outlined" color="inherit" size="small">
                    Close Archive
                </Button>
            </Box>
            <BookReader3D url={fullUrl} />
        </MainLayout>
    );
}
