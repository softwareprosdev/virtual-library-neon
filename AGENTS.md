# AGENTS.md - Virtual Library Development Guide

This file contains essential information for agentic coding assistants working on the Virtual Library platform. It includes build commands, testing procedures, code style guidelines, and development conventions.

## Tech Stack

- **Backend**: Node.js/Express 5 + TypeScript + Prisma ORM + PostgreSQL + Redis
- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + Radix UI
- **Real-time**: Socket.io + LiveKit (WebRTC)
- **Testing**: Jest (backend) + ESLint (code quality)
- **Deployment**: Docker + Coolify

## Build, Lint, and Test Commands

### Development Environment

```bash
# Start both client and server concurrently
npm run dev

# Start only client (Next.js dev server on port 3000)
npm run client

# Start only server (Express dev server on port 4000)
npm run server
```

### Backend Build & Test Commands

```bash
cd server

# Build TypeScript to JavaScript
npm run build

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run manual API tests
npm run test:api

# Run manual API tests against production
npm run test:api:prod
```

### Frontend Build & Lint Commands

```bash
cd client

# Build Next.js application
npm run build

# Start production server
npm run start

# Run ESLint
npm run lint
```

### Database Commands

```bash
cd server

# Generate Prisma client
npx prisma generate

# Run database migrations in development
npx prisma migrate dev

# Deploy migrations in production
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (development only)
npm run db:hard-reset

# Export database
npm run db:export
```

### Single Test Execution

```bash
cd server

# Run a specific test file
npm test -- __tests__/auth.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should authenticate user"

# Run tests for a specific directory
npm test -- src/routes/auth/
```

## Code Style Guidelines

### TypeScript Configuration

**Backend (server/tsconfig.json)**:
- Target: ES2016
- Module: CommonJS
- Strict mode: Disabled (for flexibility with Express types)
- Source maps: Enabled via ts-node in development

**Frontend (client/tsconfig.json)**:
- Target: ES2017
- Module: ESNext (with bundler resolution)
- Strict mode: Enabled
- JSX: React JSX transform
- Path aliases: `@/*` maps to `./*`

### Import/Export Conventions

**Backend**:
```typescript
// Group imports by type, then alphabetically
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from './routes/auth';
import { validateRequest } from './middleware/validation';
import prisma from './db';

// Named exports preferred over default exports
export { createServer, setupSocket };
```

**Frontend**:
```typescript
// React imports first
import React from 'react';

// Third-party libraries
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

// Local imports
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

// Path aliases: Use @/* for all internal imports
import { apiClient } from '@/lib/api';
```

### Naming Conventions

**Variables & Functions**:
- camelCase for variables, functions, and methods
- PascalCase for components, types, and classes
- snake_case for database columns (Prisma convention)
- SCREAMING_SNAKE_CASE for constants

**Files & Directories**:
- kebab-case for file names: `user-profile.tsx`, `auth-middleware.ts`
- PascalCase for component files: `UserProfile.tsx`
- Index files: Use `index.ts` for barrel exports

**Database Models**:
- PascalCase for model names
- camelCase for field names
- Foreign keys: `{relatedModel}Id`

### Type Safety & Validation

**Avoid `any` types** - Use proper TypeScript types:
```typescript
// ❌ Bad
function processUser(user: any) { ... }

// ✅ Good
interface User {
  id: string;
  email: string;
  name?: string;
}

function processUser(user: User) { ... }
```

**Use Zod for runtime validation**:
```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
});

type User = z.infer<typeof UserSchema>;
```

### Error Handling

**Backend - Global error handling required**:
```typescript
// Every API route must have try-catch or error middleware
app.use('/api/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
```

**Frontend - React Error Boundaries**:
```typescript
// Use error boundaries for component isolation
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component error:', error, errorInfo);
  }

  render() {
    // Error UI
  }
}
```

### Security Best Practices

**Input Sanitization**:
- Use `isomorphic-dompurify` for HTML content
- Validate all user inputs with Zod schemas
- SHA-256 hashing for sensitive contact data

**Authentication & Authorization**:
- JWT tokens with 15-minute expiration
- bcrypt password hashing (10 rounds minimum)
- Role-based access control (USER, MODERATOR, ADMIN)

**Security Headers** (Helmet.js):
- Content Security Policy (CSP)
- HSTS, X-Frame-Options, X-Content-Type-Options
- CORS configured for specific origins only

### React/Next.js Patterns

**Component Structure**:
```typescript
// Use composition over inheritance
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

**Custom Hooks**:
```typescript
// Extract reusable logic into custom hooks
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, checkAuth };
}
```

**Server Components vs Client Components**:
```typescript
// Server Component (default in Next.js 13+ app router)
export default function UserProfile({ userId }: { userId: string }) {
  // Server-side data fetching
  const user = await prisma.user.findUnique({ where: { id: userId } });

  return <UserProfileClient user={user} />;
}

// Client Component (interactive features)
'use client';

export function UserProfileClient({ user }: { user: User }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div>
      {isEditing ? <EditForm /> : <ProfileView />}
    </div>
  );
}
```

### Styling with Tailwind CSS v4

**Utility Classes**:
```typescript
// Use clsx and tailwind-merge for conditional classes
import { cn } from '@/lib/utils';

export function Button({ variant, className, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 font-medium',
        {
          'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
          'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
        },
        className
      )}
      {...props}
    />
  );
}
```

**Design System**:
- Use Radix UI components as base
- Consistent color palette and spacing
- Dark mode support via CSS variables
- Responsive design with mobile-first approach

### Database & Prisma Conventions

**Model Definition**:
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations with explicit names
  posts     Post[]   @relation("UserPosts")

  @@map("users")
}
```

**Query Optimization**:
```typescript
// Always use select to fetch only needed fields
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    email: true,
    // Exclude sensitive data like password
  },
});
```

### Testing Guidelines

**Backend Testing with Jest**:
```typescript
describe('Auth API', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany(); // Clean up
  });

  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).not.toHaveProperty('password');
  });
});
```

**Frontend Testing**:
- Component testing with React Testing Library
- Mock API calls and external dependencies
- Test user interactions and state changes

### Performance Optimization

**Backend**:
- Use Prisma `select` to fetch only required fields
- Implement proper indexing on frequently queried columns
- Use Redis for caching and session storage
- Rate limiting on API endpoints

**Frontend**:
- Code splitting with Next.js dynamic imports
- Image optimization with Next.js Image component
- Memoization with React.memo and useMemo
- Virtual scrolling for large lists

### Git Workflow

**Commit Messages**:
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Keep first line under 50 characters
- Use imperative mood: "Add feature" not "Added feature"

**Branch Naming**:
- Feature branches: `feature/user-authentication`
- Bug fixes: `fix/login-validation`
- Hotfixes: `hotfix/security-patch`

### Environment Variables

**Required Environment Variables**:

**Server (.env)**:
```
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
JWT_SECRET="32+ character secret"
CLIENT_URL="https://yourdomain.com"
LIVEKIT_API_KEY="..."
LIVEKIT_API_SECRET="..."
LIVEKIT_URL="wss://..."
RESEND_API_KEY="..." # Optional
PORT=4000
NODE_ENV="production"
```

**Client (.env.local)**:
```
NEXT_PUBLIC_API_URL="https://api.yourdomain.com/api"
NEXT_PUBLIC_SOCKET_URL="https://api.yourdomain.com"
NEXT_PUBLIC_LIVEKIT_URL="wss://your-livekit-url"
```

### Deployment

**Development**:
```bash
# Start all services
docker-compose up -d

# Run migrations
cd server && npx prisma migrate dev

# Start development servers
npm run dev
```

**Production (Coolify)**:
```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d

# Run production migrations
docker exec -it app-server npx prisma migrate deploy
```

## Integration Rules

### Windsurfrules (Senior Engineer Persona)

- **Prioritize Type Safety**: Avoid 'any' at all costs. Use Zod for schema validation.
- **Concise Code**: No bloated components. Use composition patterns.
- **Error Handling**: Every server action or API route must implement global error handling.
- **Security**: Sanitize all user-injected CSS and HTML. Use SHA-256 for contact hashing.
- **Performance**: Use Prisma's `select` to only fetch necessary fields. No `SELECT *`.

### Code Quality Enforcement

- **ESLint**: Configured with Next.js rules for both client and server
- **TypeScript**: Strict mode enabled on frontend, flexible on backend
- **Pre-commit Hooks**: Run lint and typecheck before commits
- **CI/CD**: Automated builds and tests on main branch pushes

### API Design Patterns

**RESTful Endpoints**:
- Use plural nouns: `/api/users`, `/api/rooms`
- HTTP methods: GET (read), POST (create), PUT (update), DELETE (remove)
- Consistent response format with error handling

**Socket Events**:
- Client → Server: `camelCase` events
- Server → Client: `camelCase` events
- Room-specific events include room ID

### File Organization

```
server/
├── src/
│   ├── routes/          # API route handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Business logic (if not in routes)
│   ├── utils/           # Helper functions
│   ├── socket.ts        # Socket.io setup
│   └── index.ts         # Server entry point
└── prisma/
    └── schema.prisma    # Database schema

client/
├── app/                 # Next.js app router
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   └── forms/          # Form components
├── lib/                # Utilities and configurations
├── hooks/              # Custom React hooks
└── types/              # TypeScript type definitions
```

This guide ensures consistency across the codebase and helps maintain high-quality, secure, and performant code. Always refer to existing patterns in the codebase before implementing new features.</content>
<parameter name="filePath">/home/rogue/Documents/ding/virtual-library-neon/AGENTS.md