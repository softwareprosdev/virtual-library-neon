/**
 * Google Books API Integration
 * Provides book search, metadata retrieval, and preview access
 * Uses server-side proxy to avoid CORS and add caching
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';


export interface GoogleBook {
    id: string;
    volumeInfo: {
        title: string;
        authors?: string[];
        publisher?: string;
        publishedDate?: string;
        description?: string;
        pageCount?: number;
        categories?: string[];
        averageRating?: number;
        ratingsCount?: number;
        imageLinks?: {
            thumbnail?: string;
            smallThumbnail?: string;
            small?: string;
            medium?: string;
            large?: string;
            extraLarge?: string;
        };
        language?: string;
        previewLink?: string;
        infoLink?: string;
        canonicalVolumeLink?: string;
        industryIdentifiers?: Array<{
            type: string;
            identifier: string;
        }>;
    };
    accessInfo?: {
        epub?: {
            isAvailable: boolean;
            acsTokenLink?: string;
        };
        pdf?: {
            isAvailable: boolean;
            acsTokenLink?: string;
        };
        webReaderLink?: string;
    };
}

export interface BookSearchResult {
    items: GoogleBook[];
    totalItems: number;
}

/**
 * Search for books using Google Books API
 */
export async function searchBooks(
    query: string,
    options: {
        maxResults?: number;
        startIndex?: number;
        orderBy?: 'relevance' | 'newest';
        printType?: 'all' | 'books' | 'magazines';
        filter?: 'partial' | 'full' | 'free-ebooks' | 'paid-ebooks' | 'ebooks';
    } = {}
): Promise<BookSearchResult> {
    try {
        const {
            maxResults = 20,
            startIndex = 0,
            orderBy = 'relevance',
            printType = 'books',
            filter,
        } = options;

        const params = new URLSearchParams({
            q: query,
            maxResults: maxResults.toString(),
            startIndex: startIndex.toString(),
            orderBy,
            printType,
            ...(filter && { filter }),
        });

        const response = await fetch(`${API_BASE_URL}/google-books/search?${params}`);

        if (!response.ok) {
            throw new Error(`Google Books API error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error searching books:', error);
        return {
            items: [],
            totalItems: 0,
        };
    }
}

/**
 * Get detailed information about a specific book by Google Books ID
 */
export async function getBookById(bookId: string): Promise<GoogleBook | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/google-books/${bookId}`);

        if (!response.ok) {
            throw new Error(`Google Books API error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching book by ID:', error);
        return null;
    }
}

/**
 * Search books by ISBN
 */
export async function searchByISBN(isbn: string): Promise<GoogleBook | null> {
    try {
        const result = await searchBooks(`isbn:${isbn}`, { maxResults: 1 });
        return result.items[0] || null;
    } catch (error) {
        console.error('Error searching by ISBN:', error);
        return null;
    }
}

/**
 * Get book recommendations based on a book
 */
export async function getRelatedBooks(
    bookId: string,
    maxResults: number = 10
): Promise<GoogleBook[]> {
    try {
        const book = await getBookById(bookId);
        if (!book) return [];

        const { title, authors, categories } = book.volumeInfo;

        // Search for similar books using author and categories
        const searchQuery = [
            authors?.[0],
            categories?.[0],
            'subject:' + categories?.[0],
        ]
            .filter(Boolean)
            .join(' ');

        const result = await searchBooks(searchQuery, { maxResults });
        // Filter out the original book
        return result.items.filter((item) => item.id !== bookId);
    } catch (error) {
        console.error('Error getting related books:', error);
        return [];
    }
}

/**
 * Get popular books by category
 */
export async function getPopularBooksByCategory(
    category: string,
    maxResults: number = 20
): Promise<GoogleBook[]> {
    try {
        const result = await searchBooks(`subject:${category}`, {
            maxResults,
            orderBy: 'relevance',
        });
        return result.items;
    } catch (error) {
        console.error('Error getting popular books:', error);
        return [];
    }
}

/**
 * Format book data for database storage
 */
export function formatBookForDB(googleBook: GoogleBook) {
    const { volumeInfo, id } = googleBook;
    const isbn13 = volumeInfo.industryIdentifiers?.find(
        (id) => id.type === 'ISBN_13'
    )?.identifier;
    const isbn10 = volumeInfo.industryIdentifiers?.find(
        (id) => id.type === 'ISBN_10'
    )?.identifier;

    return {
        googleBooksId: id,
        title: volumeInfo.title,
        author: volumeInfo.authors?.join(', '),
        description: volumeInfo.description,
        coverUrl:
            volumeInfo.imageLinks?.large ||
            volumeInfo.imageLinks?.medium ||
            volumeInfo.imageLinks?.thumbnail,
        isbn: isbn13 || isbn10,
        isbn13,
        pageCount: volumeInfo.pageCount,
        publishedDate: volumeInfo.publishedDate,
        categories: volumeInfo.categories || [],
        averageRating: volumeInfo.averageRating,
    };
}

/**
 * Extract clean ISBN from various formats
 */
export function cleanISBN(isbn: string): string {
    return isbn.replace(/[-\s]/g, '');
}

export default {
    searchBooks,
    getBookById,
    searchByISBN,
    getRelatedBooks,
    getPopularBooksByCategory,
    formatBookForDB,
    cleanISBN,
};
