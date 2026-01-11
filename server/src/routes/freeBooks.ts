import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middlewares/auth';

const router = Router();

// Gutendex API (Project Gutenberg)
router.get('/gutenberg', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, page = '1', topic, language = 'en' } = req.query;
    // Safely parse page number
    const pageNum = Math.max(1, parseInt(page as string) || 1);

    let url = `https://gutendex.com/books/?page=${pageNum}`;

    if (search) {
      url += `&search=${encodeURIComponent(search as string)}`;
    }
    if (topic) {
      url += `&topic=${encodeURIComponent(topic as string)}`;
    }
    if (language) {
      url += `&languages=${language}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Gutenberg API failed: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response body:', text);
      res.status(response.status).json({ message: 'Failed to fetch from Project Gutenberg' });
      return;
    }

    const data = await response.json();

    res.json({
      books: data.results?.map((book: any) => ({
        id: `gutenberg-${book.id}`,
        title: book.title,
        authors: book.authors?.map((a: any) => a.name) || ['Unknown'],
        subjects: book.subjects || [],
        bookshelves: book.bookshelves || [],
        languages: book.languages || [],
        copyright: book.copyright,
        mediaType: book.media_type,
        formats: book.formats, // Contains links to epub, html, txt, etc
        downloadCount: book.download_count,
        coverImage: book.formats?.['image/jpeg'] || null,
        source: 'gutenberg'
      })) || [],
      count: data.count || 0,
      next: data.next,
      previous: data.previous
    });
  } catch (error) {
    console.error('Gutenberg API error:', error);
    res.status(500).json({ message: 'Failed to fetch from Project Gutenberg' });
  }
});

// Open Library API
router.get('/openlibrary', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '20', subject } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 20);
    const offset = (pageNum - 1) * limitNum;

    let url: string;

    // If no search provided, return trending/featured books by subject
    if (!search) {
      const defaultSubject = (subject as string) || 'fiction';
      url = `https://openlibrary.org/subjects/${encodeURIComponent(defaultSubject)}.json?limit=${limitNum}&offset=${offset}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Open Library API failed: ${response.status} ${response.statusText}`);
        res.status(response.status).json({ message: 'Failed to fetch from Open Library' });
        return;
      }

      const data = await response.json();
      res.json({
        books: data.works?.map((book: any) => ({
          id: `openlibrary-${book.key}`,
          title: book.title,
          authors: book.authors?.map((a: any) => a.name) || ['Unknown'],
          publishYear: book.first_publish_year,
          coverImage: book.cover_id
            ? `https://covers.openlibrary.org/b/id/${book.cover_id}-L.jpg`
            : null,
          openLibraryId: book.key,
          hasFulltext: book.has_fulltext || false,
          ia: book.ia,
          source: 'openlibrary'
        })) || [],
        totalFound: data.work_count || 0,
        start: offset
      });
      return;
    }

    url = `https://openlibrary.org/search.json?q=${encodeURIComponent(search as string)}&limit=${limitNum}&offset=${offset}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Open Library API failed: ${response.status} ${response.statusText}`);
      res.status(response.status).json({ message: 'Failed to fetch from Open Library' });
      return;
    }

    const data = await response.json();

    res.json({
      books: data.docs?.map((book: any) => ({
        id: `openlibrary-${book.key}`,
        title: book.title,
        authors: book.author_name || ['Unknown'],
        publishYear: book.first_publish_year,
        isbn: book.isbn?.[0],
        subjects: book.subject?.slice(0, 10) || [],
        publishers: book.publisher?.slice(0, 5) || [],
        numberOfPages: book.number_of_pages_median,
        coverImage: book.cover_i
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
          : null,
        openLibraryId: book.key,
        editionCount: book.edition_count,
        hasFulltext: book.has_fulltext || false,
        ia: book.ia, // Internet Archive identifiers
        source: 'openlibrary'
      })) || [],
      totalFound: data.numFound || 0,
      start: data.start || 0
    });
  } catch (error) {
    console.error('Open Library API error:', error);
    res.status(500).json({ message: 'Failed to fetch from Open Library' });
  }
});

// Get book details from Open Library
router.get('/openlibrary/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const url = `https://openlibrary.org${id}.json`;

    const response = await fetch(url);
    const data = await response.json();

    res.json({
      id: `openlibrary-${id}`,
      title: data.title,
      description: data.description?.value || data.description || '',
      covers: data.covers?.map((coverId: number) =>
        `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      ) || [],
      subjects: data.subjects || [],
      source: 'openlibrary',
      raw: data
    });
  } catch (error) {
    console.error('Open Library detail error:', error);
    res.status(500).json({ message: 'Failed to fetch book details' });
  }
});

// Search combined sources
router.get('/search', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q, page = '1' } = req.query;

    if (!q) {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }

    // Fetch from both APIs in parallel
    const [gutenbergResponse, openLibraryResponse] = await Promise.allSettled([
      fetch(`https://gutendex.com/books/?search=${encodeURIComponent(q as string)}&page=${page}`),
      fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q as string)}&limit=10`)
    ]);

    const results: any[] = [];

    // Process Gutenberg results
    if (gutenbergResponse.status === 'fulfilled' && gutenbergResponse.value.ok) {
      const gutenbergData = await gutenbergResponse.value.json();
      const gutenbergBooks = gutenbergData.results?.slice(0, 10).map((book: any) => ({
        id: `gutenberg-${book.id}`,
        title: book.title,
        authors: book.authors?.map((a: any) => a.name) || ['Unknown'],
        coverImage: book.formats?.['image/jpeg'] || null,
        formats: book.formats,
        downloadCount: book.download_count,
        source: 'gutenberg'
      })) || [];
      results.push(...gutenbergBooks);
    }

    // Process Open Library results
    if (openLibraryResponse.status === 'fulfilled' && openLibraryResponse.value.ok) {
      const openLibData = await openLibraryResponse.value.json();
      const openLibBooks = openLibData.docs?.slice(0, 10).map((book: any) => ({
        id: `openlibrary-${book.key}`,
        title: book.title,
        authors: book.author_name || ['Unknown'],
        coverImage: book.cover_i
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
          : null,
        publishYear: book.first_publish_year,
        hasFulltext: book.has_fulltext,
        ia: book.ia,
        source: 'openlibrary'
      })) || [];
      results.push(...openLibBooks);
    }

    res.json({ books: results });
  } catch (error) {
    console.error('Free books search error:', error);
    res.status(500).json({ message: 'Failed to search free books' });
  }
});

// Popular/Trending books from Gutenberg
router.get('/popular', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1' } = req.query;

    // Sort by download count (most popular)
    const url = `https://gutendex.com/books/?page=${page}&sort=popular`;

    const response = await fetch(url);
    const data = await response.json();

    res.json({
      books: data.results?.map((book: any) => ({
        id: `gutenberg-${book.id}`,
        title: book.title,
        authors: book.authors?.map((a: any) => a.name) || ['Unknown'],
        subjects: book.subjects || [],
        formats: book.formats,
        downloadCount: book.download_count,
        coverImage: book.formats?.['image/jpeg'] || null,
        source: 'gutenberg'
      })) || [],
      count: data.count || 0
    });
  } catch (error) {
    console.error('Popular books error:', error);
    res.status(500).json({ message: 'Failed to fetch popular books' });
  }
});

export default router;
