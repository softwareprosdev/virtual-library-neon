# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies including dev deps for build (TypeScript)
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
# Install only production dependencies
RUN npm ci --only=production

# Copy built artifacts and necessary prisma files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Generate client again for the production environment (linux-musl)
RUN npx prisma generate

EXPOSE 4000

CMD ["node", "dist/index.js"]
