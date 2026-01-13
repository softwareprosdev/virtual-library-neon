import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middlewares/auth';

const router = Router();

const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';
const GOOGLE_BOOKS_BASE_URL = 'https://www.googleapis.com/books/v1';

// Simple in-memory cache for book searches (production should use Redis)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function getCached(key: string) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    cache.delete(key);
    return null;
}

function setCache(key: string, data: any) {
    cache.set(key, { data, timestamp: Date.now() });
}

// Search books
router.get('/search', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const {
            q,
            maxResults = '20',
            startIndex = '0',
            orderBy = 'relevance',
            printType = 'books',
            filter,
        } = req.query as Record<string, string>;

        if (!q) {
            res.status(400).json({ message: 'Query parameter "q" is required' });
            return;
        }

        const cacheKey = `search:${q}:${maxResults}:${startIndex}:${orderBy}:${printType
            }:${filter || ''}`;
        const cached = getCached(cacheKey);

        if (cached) {
            res.json(cached);
            return;
        }

        const params = new URLSearchParams({
            q,
            maxResults,
            startIndex,
            orderBy,
            printType,
            ...(filter && { filter }),
            ...(GOOGLE_BOOKS_API_KEY && { key: GOOGLE_BOOKS_API_KEY }),
        });

        const response = await fetch(`${GOOGLE_BOOKS_BASE_URL}/volumes?${params}`);

        if (!response.ok) {
            throw new Error(`Google Books API error: ${response.statusText}`);
        }

        const data = await response.json();
        const result = {
            items: data.items || [],
            totalItems: data.totalItems || 0,
        };

        setCache(cacheKey, result);
        res.json(result);
    } catch (error) {
        console.error('Error searching books:', error);
        res.status(500).json({ message: 'Failed to search books' });
    }
});

// Get book by ID
router.get('/:bookId', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { bookId } = req.params;

        const cacheKey = `book:${bookId}`;
        const cached = getCached(cacheKey);

        if (cached) {
            res.json(cached);
            return;
        }

        const params = new URLSearchParams({
            ...(GOOGLE_BOOKS_API_KEY && { key: GOOGLE_BOOKS_API_KEY }),
        });

        const response = await fetch(
            `${GOOGLE_BOOKS_BASE_URL}/volumes/${bookId}?${params}`
        );

        if (!response.ok) {
            if (response.status === 404) {
                res.status(404).json({ message: 'Book not found' });
                return;
            }
            throw new Error(`Google Books API error: ${response.statusText}`);
        }

        const data = await response.json();
        setCache(cacheKey, data);
        res.json(data);
    } catch (error) {
        console.error('Error fetching book:', error);
        res.status(500).json({ message: 'Failed to fetch book' });
    }
});

export default router;
