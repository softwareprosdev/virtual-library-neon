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

export async function searchBooks(query: string): Promise<GoogleBook[]> {
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`);
    if (!res.ok) {
      throw new Error(`Google Books API error: ${res.statusText}`);
    }
    const data = await res.json();
    return data.items || [];
  } catch (error) {
    console.error("Failed to fetch books:", error);
    return [];
  }
}
