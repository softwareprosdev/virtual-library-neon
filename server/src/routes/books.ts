import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdf from 'pdf-parse';

const router = Router();

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|epub/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) return cb(null, true);
    cb(new Error("Only .pdf and .epub files are allowed"));
  }
});

// Search Books (Title, Author, Content)
router.get('/search', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ message: "Query required" });
      return;
    }

    const books = await prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { author: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } }
        ],
        ownerId: req.user.id
      },
      select: {
        id: true,
        title: true,
        author: true,
        fileUrl: true,
        fileType: true,
        createdAt: true
      }
    });
    res.json(books);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Search failed" });
  }
});

// List User's Books
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const books = await prisma.book.findMany({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Upload Book
router.post('/upload', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const { title, author } = req.body;
    let content = '';

    // Extract text if PDF
    if (req.file.mimetype === 'application/pdf' || req.file.filename.endsWith('.pdf')) {
      try {
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdf(dataBuffer);
        content = data.text;
      } catch (err) {
        console.error("PDF Parse Error:", err);
      }
    }

    const book = await prisma.book.create({
      data: {
        title: title || req.file.originalname,
        author: author || 'Unknown',
        fileUrl: `/uploads/${req.file.filename}`,
        fileType: path.extname(req.file.originalname).substring(1),
        ownerId: req.user.id,
        content: content || null
      }
    });

    res.status(201).json(book);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Upload failed" });
  }
});

// Delete Book
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const book = await prisma.book.findUnique({ where: { id } });

    if (!book || book.ownerId !== req.user.id) {
      res.status(404).json({ message: "Book not found" });
      return;
    }

    await prisma.book.delete({ where: { id } });
    res.json({ message: "Book deleted" });
  } catch (error) {
    res.status(500).json({ message: "Deletion failed" });
  }
});

export default router;
