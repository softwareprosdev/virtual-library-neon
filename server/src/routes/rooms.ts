import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';

const router = Router();
const isProduction = process.env.NODE_ENV === 'production';

// Industry identifier type for Google Books API
interface IndustryIdentifier {
  type: string;
  identifier: string;
}

// List all genres with live room counts
router.get('/genres', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const genres = await prisma.genre.findMany({
      include: {
        _count: {
          select: { rooms: { where: { isLive: true } } }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(genres);
  } catch (error) {
    if (!isProduction) console.error('Genre Error:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// List all active rooms with personalization
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    // 1. Get user's top genres from interactions
    const topInteractions = await prisma.interaction.groupBy({
      by: ['genreId'],
      where: { userId: req.user.id, NOT: { genreId: null } },
      _count: { genreId: true },
      orderBy: { _count: { genreId: 'desc' } },
      take: 3
    });

    const interestedGenreIds = topInteractions.map((i: { genreId: string | null }) => i.genreId as string);

    // 2. Fetch rooms prioritizing these genres
    const rooms = await prisma.room.findMany({
      where: { isLive: true },
      include: {
        host: { select: { name: true, email: true } },
        genre: true,
        _count: { select: { messages: true, participants: true } }
      },
      orderBy: [{ createdAt: 'desc' }]
    });

    // 3. Simple sorting in JS for personalized ordering
    const personalizedRooms = [...rooms].sort((a, b) => {
      const aInt = a.genreId && interestedGenreIds.includes(a.genreId) ? 1 : 0;
      const bInt = b.genreId && interestedGenreIds.includes(b.genreId) ? 1 : 0;
      return bInt - aInt;
    });

    res.json(personalizedRooms);
  } catch (error) {
    if (!isProduction) console.error('Room Error:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a room
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    const { name, description, genreId, bookData } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ message: "Room name is required" });
      return;
    }

    // Validate room name length
    if (name.length < 3 || name.length > 100) {
      res.status(400).json({ message: "Room name must be 3-100 characters" });
      return;
    }

    const room = await prisma.room.create({
      data: {
        name: name.trim(),
        description: description ? String(description).substring(0, 500) : null,
        hostId: req.user.id,
        genreId: genreId || null,
        isLive: true,
        // If bookData exists, create the book relation immediately
        books: bookData && bookData.title ? {
          create: {
            title: String(bookData.title).substring(0, 255),
            author: Array.isArray(bookData.authors) ? bookData.authors.join(', ').substring(0, 255) : null,
            description: bookData.description ? String(bookData.description).substring(0, 1000) : null,
            coverUrl: bookData.imageLinks?.thumbnail ? String(bookData.imageLinks.thumbnail) : null,
            googleId: bookData.id ? String(bookData.id) : null,
            isbn: Array.isArray(bookData.industryIdentifiers)
                  ? ((bookData.industryIdentifiers as IndustryIdentifier[]).find((id) => id.type === 'ISBN_13')?.identifier || null)
                  : null,
            ownerId: req.user.id,
          }
        } : undefined
      },
      include: { genre: true, books: true }
    });

    res.status(201).json(room);
  } catch (error) {
    if (!isProduction) console.error("Create Room Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single room
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        genre: true,
        books: true, // Include associated books
        messages: {
          take: 50,
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    res.json(room);
  } catch (error) {
    console.error(`Error fetching room ${req.params.id}:`, error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
});

export default router;