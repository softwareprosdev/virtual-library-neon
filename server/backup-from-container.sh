#!/bin/bash

# Database Backup Script for Coolify Container
# Run this inside your application container

echo "🗄️  Starting database backup..."

# Create backup directory
mkdir -p /app/server/backups

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/app/server/backups/backup_${TIMESTAMP}.sql"

echo "📦 Exporting database to: $BACKUP_FILE"

# Export the database
pg_dump "$DATABASE_URL" --no-owner --no-acl > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup completed successfully!"
    echo "📊 Backup size: $FILE_SIZE"
    echo "📁 File location: $BACKUP_FILE"
    echo ""
    echo "📤 To download this backup from the container, run this from your LOCAL machine:"
    echo ""
    echo "   docker cp <container_name>:$BACKUP_FILE ./backup_${TIMESTAMP}.sql"
    echo ""
    echo "   Replace <container_name> with your actual container name from 'docker ps'"
else
    echo "❌ Backup failed!"
    exit 1
fi
