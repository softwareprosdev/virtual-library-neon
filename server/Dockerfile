# Build Stage
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies including dev deps for build (TypeScript)
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# Production Stage
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl ca-certificates

COPY package*.json ./
# Install only production dependencies
RUN npm install --only=production

# Copy built artifacts and necessary prisma files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Generate client again for the production environment
RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "run", "start:prod"]
