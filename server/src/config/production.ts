// Production configuration file
const isProduction = process.env.NODE_ENV === 'production';

const config = {
  isProduction,
  
  // Server settings
  port: process.env.PORT || (isProduction ? 4000 : 4000),
  
  // CORS settings
  allowedOrigins: isProduction 
    ? [
        process.env.CLIENT_URL || 'https://yourdomain.com',
        'https://www.yourdomain.com'
      ]
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://www.indexbin.com',
        'https://indexbin.com',
        'https://api.indexbin.com'
      ],
  
  // Security settings
  trustProxy: isProduction ? 1 : 0,
  
  // Database settings
  database: {
    url: process.env.DATABASE_URL
  },
  
  // Redis settings
  redis: {
    url: process.env.REDIS_URL
  },
  
  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // LiveKit settings
  livekit: {
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL
  },
  
  // Email settings
  email: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
    hunterApiKey: process.env.HUNTER_API_KEY,
    abstractApiKey: process.env.ABSTRACT_API_KEY
  },
  
  // File storage settings
  storage: {
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    awsS3Bucket: process.env.AWS_S3_BUCKET
  },
  
  // Rate limiting
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    authMaxRequests: 20,
    strictMaxRequests: 5
  }
};

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
if (isProduction) {
  requiredEnvVars.push('CLIENT_URL', 'RESEND_API_KEY');
}

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  if (isProduction) {
    process.exit(1);
  }
}

export default config;