import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';

const router = Router();

// Generate Recap for a finished room
router.post('/recap/:roomId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    
    // 1. Fetch Transcripts/Messages
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { 
        messages: {
          include: { sender: { select: { name: true } } }
        },
        transcripts: true,
        books: true,
        genre: true
      }
    });

    if (!room) {
      res.status(404).json({ message: "Archive not found" });
      return;
    }

    // 2. Enhanced AI Processing
    // In a real scenario, we'd send transcripts to Gemini/OpenAI here.
    const messageCount = room.messages.length;
    const participantNames = [...new Set(room.messages.map(m => m.sender.name))].slice(0, 3);
    const duration = room.transcripts.length > 0 ? `${room.transcripts.length} transcript segments` : 'unknown duration';
    
    let summary = `This session explored "${room.name}"`;
    if (room.books && room.books.length > 0) {
      summary += ` - a discussion about "${room.books[0].title}" by ${room.books[0].author}`;
    }
    summary += `. ${messageCount} messages were exchanged between ${participantNames.length} participants over ${duration}.`;
    
    // Generate more intelligent highlights based on message patterns
    const highlights = [
      messageCount > 50 ? "High engagement with extensive discussion and analysis" : "Focused and thoughtful conversation",
      participantNames.length > 2 ? "Active participation from multiple community members" : "Intimate one-on-one dialogue",
      room.books && room.books.length > 0 ? "Deep literary analysis with nuanced perspectives" : "General discussion with diverse viewpoints",
      `Session concluded with ${messageCount > 20 ? 'rich' : 'concise'} insights and takeaways`
    ];

    const recap = await prisma.recap.upsert({
      where: { roomId },
      update: { summary, highlights },
      create: { roomId, summary, highlights }
    });

    res.json(recap);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "AI Processing Failed" });
  }
});

// Get Book Recommendations
router.get('/recommendations', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    // Get user's reading history and preferences
    const userBooks = await prisma.book.findMany({
      where: { ownerId: req.user.id },
      select: { 
        title: true, 
        author: true, 
        createdAt: true 
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const userRooms = await prisma.room.findMany({
      where: { 
        participants: { some: { userId: req.user.id } },
        genreId: { not: null }
      },
      include: { genre: true },
      take: 5
    });

    // Analyze preferences
    const genres = [...new Set(userRooms.map(r => r.genre?.name).filter(Boolean))];
    const authors = [...new Set(userBooks.map(b => b.author))];

    // Simulated AI recommendations based on user history
    const recommendations = [
      {
        type: 'book',
        title: "The Midnight Library",
        author: "Matt Haig",
        reason: genres.includes('Philosophy') ? "Based on your interest in philosophical fiction" : "Popular in your reading circles"
      },
      {
        type: 'book', 
        title: "Project Hail Mary",
        author: "Andy Weir",
        reason: genres.includes('Science Fiction') ? "Perfect for sci-fi enthusiasts like you" : "Highly rated by similar readers"
      },
      {
        type: 'room',
        title: "Weekly Book Club",
        description: "Join discussions on contemporary literature",
        reason: userBooks.length > 5 ? "Perfect for avid readers like yourself" : "Great way to discover new books"
      }
    ];

    res.json({
      recommendations,
      insights: {
        totalBooksRead: userBooks.length,
        favoriteGenres: genres.slice(0, 3),
        readingStreak: userBooks.length > 3 ? "Active" : "Getting started"
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to generate recommendations" });
  }
});

// Summarize Chat History
router.post('/summarize/:roomId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { maxMessages = 50 } = req.body;
    
    // Fetch recent messages
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { 
        messages: {
          include: { sender: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: maxMessages
        }
      }
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (room.messages.length === 0) {
      res.json({ summary: "No messages to summarize." });
      return;
    }

    // Generate intelligent summary
    const messages = room.messages.reverse();
    const participantCount = new Set(messages.map(m => m.sender.name)).size;
    const messageCount = messages.length;
    
    // Extract key themes (simplified - in production would use NLP)
    const allText = messages.map(m => m.text).join(' ').toLowerCase();
    const themes = [];
    if (allText.includes('character')) themes.push('Character development');
    if (allText.includes('plot')) themes.push('Plot analysis');
    if (allText.includes('theme')) themes.push('Thematic discussion');
    if (allText.includes('writing')) themes.push('Writing style');
    if (allText.includes('ending')) themes.push('Ending analysis');

    const summary = `Discussion with ${participantCount} participants covering ${themes.length > 0 ? themes.join(', ') : 'various literary topics'}. The conversation spanned ${messageCount} messages with active engagement throughout.`;

    res.json({
      summary,
      stats: {
        participantCount,
        messageCount,
        themes: themes.length,
        duration: messages.length > 0 ? {
          start: messages[0].createdAt,
          end: messages[messages.length - 1].createdAt
        } : null
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to summarize chat" });
  }
});

// Get Recap
router.get('/recap/:roomId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const recap = await prisma.recap.findUnique({
      where: { roomId: req.params.roomId }
    });
    if (!recap) {
      res.status(404).json({ message: "No recap available" });
      return;
    }
    res.json(recap);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
