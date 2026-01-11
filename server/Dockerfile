# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl compat-openssl1.1 libc6-compat

COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies including dev deps for build (TypeScript)
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl compat-openssl1.1 libc6-compat

COPY package*.json ./
# Install only production dependencies
RUN npm install --only=production

# Copy built artifacts and necessary prisma files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/app ./app

# Generate client again for the production environment (linux-musl)
RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "run", "start:prod"]
