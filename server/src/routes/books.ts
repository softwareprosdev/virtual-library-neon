import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';

const router = Router();
const isProduction = process.env.NODE_ENV === 'production';

// Configure Storage (S3 or Local)
const isS3Enabled = !!process.env.AWS_S3_BUCKET;
let storage;

if (isS3Enabled) {
  const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
  });

  storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, `books/${Date.now()}-${file.originalname}`);
    }
  });
  console.log('✅ S3 Storage Enabled for Books');
} else {
  storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  });
  console.log('⚠️ Local Storage Enabled (Not persistent across deployments)');
}

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
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

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
    if (!isProduction) console.error(error);
    res.status(500).json({ message: "Search failed" });
  }
});

// List User's Books
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

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
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const { title, author } = req.body;
    let content = '';
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileLocation = (req.file as any).location;
    const fileUrl = fileLocation || `/uploads/${req.file.filename}`;

    // Extract text if PDF (Local storage only)
    // TODO: Implement S3 stream reading for text extraction
    if ((req.file.mimetype === 'application/pdf' || req.file.filename?.endsWith('.pdf')) && !fileLocation && req.file.path) {
      try {
        const dataBuffer = fs.readFileSync(req.file.path);
        const parser = new PDFParse({ data: dataBuffer });
        const result = await parser.getText();
        content = result.text;
        await parser.destroy();
      } catch (err) {
        if (!isProduction) console.error("PDF Parse Error:", err);
      }
    }

    const book = await prisma.book.create({
      data: {
        title: title || req.file.originalname,
        author: author || 'Unknown',
        fileUrl: fileUrl,
        fileType: path.extname(req.file.originalname).substring(1),
        ownerId: req.user.id,
        content: content || null
      }
    });

    res.status(201).json(book);
  } catch (error) {
    if (!isProduction) console.error(error);
    res.status(500).json({ message: "Upload failed" });
  }
});

// Delete Book
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

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
