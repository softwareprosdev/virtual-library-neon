#!/bin/bash

# Deployment Script for Virtual Library

set -e  # Exit on any error

echo "🚀 Starting Virtual Library Deployment..."

# Check if we're in the right directory
if [ ! -f "server/package.json" ] || [ ! -f "client/package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

# Check for required environment files
if [ ! -f "server/.env" ]; then
    echo "❌ Error: server/.env file not found"
    echo "Please copy server/.env.example to server/.env and configure your environment variables"
    exit 1
fi

echo "📦 Installing server dependencies..."
cd server
npm ci --production
npm run build

echo "✅ Server build completed"

echo "📦 Installing client dependencies..."
cd ../client
npm ci
npm run build

echo "✅ Client build completed"

echo "🗄️  Running database migrations..."
cd ../server
npx prisma migrate deploy

echo "✅ Database migrations completed"

echo "🔧 Generating Prisma client..."
npx prisma generate

echo "✅ Prisma client generated"

echo "🚀 Starting production server..."
npm run start:prod

echo "✅ Deployment completed successfully!"