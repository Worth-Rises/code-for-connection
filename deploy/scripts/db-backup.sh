#!/bin/bash
# db-backup.sh
# Creates a backup of the PostgreSQL database.
#
# What this does:
#   Exports all database tables and data to a .sql file that can be
#   used later to restore the database to this point in time.
#
# Usage:
#   ./deploy/scripts/db-backup.sh
#   ./deploy/scripts/db-backup.sh my-backup-name
#
# The backup is saved to: backups/YYYY-MM-DD-HH-MM-SS.sql
# or: backups/<your-name>.sql
#
# What can go wrong:
#   - "No database connection found": Start Docker (docker compose up -d postgres) or set DATABASE_URL
#   - "pg_dump not found": Install postgresql-client, or use the Docker method (start Docker first)
#   - Backup file is 0 bytes: The database may be empty, or the connection failed silently

set -e  # Stop on any error

BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

if [ -n "$1" ]; then
    FILENAME="$BACKUP_DIR/$1.sql"
else
    FILENAME="$BACKUP_DIR/$(date +%Y-%m-%d-%H-%M-%S).sql"
fi

echo "Backing up database to $FILENAME..."

# If using Docker (local development)
if docker ps | grep -q openconnect-postgres; then
    docker exec openconnect-postgres pg_dump -U openconnect openconnect > "$FILENAME"
# If using a direct connection (production)
elif [ -n "$DATABASE_URL" ]; then
    pg_dump "$DATABASE_URL" > "$FILENAME"
else
    echo "ERROR: No database connection found."
    echo "Either start Docker (docker compose up -d postgres) or set DATABASE_URL."
    exit 1
fi

echo "Backup complete: $FILENAME ($(wc -c < "$FILENAME" | tr -d ' ') bytes)"
