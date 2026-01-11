import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ message: 'URL is required' });
    return;
  }

  try {
    // Decode the URL in case it was encoded multiple times or correctly passed
    const targetUrl = decodeURIComponent(url);
    
    // Basic validation to ensure it's a valid URL
    new URL(targetUrl);

    // Fetch the resource
    const response = await axios({
      method: 'get',
      url: targetUrl,
      responseType: 'stream',
      headers: {
        // Mimic a browser to avoid some basic bot blocking, though Gutenberg usually allows tools
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Forward the Content-Type header
    const contentType = response.headers['content-type'];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Forward Content-Length if available
    const contentLength = response.headers['content-length'];
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    
    // Allow CORS for the client
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    // Pipe the data
    response.data.pipe(res);

  } catch (error) {
    console.error('Proxy request failed:', error);
    if (axios.isAxiosError(error) && error.response) {
       res.status(error.response.status).json({ message: 'Error fetching external resource' });
    } else {
       res.status(500).json({ message: 'Internal Proxy Error' });
    }
  }
});

export default router;
