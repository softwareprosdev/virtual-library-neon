export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail: string;
      smallThumbnail?: string;
    };
    categories?: string[];
    publishedDate?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    pageCount?: number;
    publisher?: string;
  };
}

export interface SearchBooksResult {
  books: GoogleBook[];
  totalItems: number;
  hasMore: boolean;
}

export async function searchBooks(
  query: string,
  startIndex: number = 0,
  maxResults: number = 20
): Promise<SearchBooksResult> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&startIndex=${startIndex}&maxResults=${maxResults}`
    );
    if (!res.ok) {
      throw new Error(`Google Books API error: ${res.statusText}`);
    }
    const data = await res.json();
    const books = data.items || [];
    const totalItems = data.totalItems || 0;
    return {
      books,
      totalItems,
      hasMore: startIndex + books.length < totalItems
    };
  } catch (error) {
    console.error("Failed to fetch books:", error);
    return { books: [], totalItems: 0, hasMore: false };
  }
}

export async function getTrendingBooks(): Promise<GoogleBook[]> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=subject:fiction&orderBy=relevance&maxResults=10`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

export async function getNewReleases(): Promise<GoogleBook[]> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=subject:fiction&orderBy=newest&maxResults=10`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}
