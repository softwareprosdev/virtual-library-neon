virtual-library/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── .env.example                # Environment variables template
├── docker-compose.yml          # Local orchestration
├── README.md                   # This file
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # DB migrations
├── server/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            # Entry point
│       ├── db.ts               # Prisma client
│       ├── socket.ts           # Socket.io server with auth
│       ├── redis.ts            # Redis client
│       ├── middlewares/
│       │   └── auth.ts         # JWT middleware
│       ├── routes/
│       │   ├── auth.ts         # Auth endpoints
│       │   ├── rooms.ts        # Room CRUD
│       │   └── books.ts        # Book management
│       └── utils/
│           └── logger.ts       # Pino logger
└── client/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── next.config.js
    ├── .env.local.example
    ├── app/                    # Next.js App Router
    │   ├── layout.tsx          # Root layout
    │   ├── page.tsx            # Home page
    │   ├── home/
    │   │   └── page.tsx
    │   ├── room/
    │   │   └── page.tsx
    │   └── api/                # API routes (if needed)
    ├── components/
    │   ├── RoomSelector.tsx
    │   ├── ChatPanel.tsx
    │   ├── VideoPanel.tsx
    │   ├── BookReader.tsx
    │   └── VoiceRecorder.tsx
    ├── lib/
    │   ├── socket.ts           # Socket.io client
    │   └── theme.ts            # MUI theme
    └── styles/
        ├── theme.ts            # MUI configuration
        └── globals.css
