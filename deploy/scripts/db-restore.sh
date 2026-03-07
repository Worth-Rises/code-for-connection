#!/bin/bash
# db-restore.sh
# Restores the PostgreSQL database from a backup file.
#
# What this does:
#   Loads a previously saved .sql backup file into the database,
#   replacing all current data with the data from the backup.
#
# Usage:
#   ./deploy/scripts/db-restore.sh backups/2026-03-07-14-30-00.sql
#   ./deploy/scripts/db-restore.sh backups/my-backup-name.sql
#
# To see available backups:
#   ls -la backups/
#
# What can go wrong:
#   - "No such file": Check the backup path. Run "ls backups/" to see available backups.
#   - "No database connection found": Start Docker (docker compose up -d postgres) or set DATABASE_URL
#   - "Permission denied": The database user may not have permission to drop/create tables.
#     Try running: docker compose down -v && docker compose up -d postgres
#     Then restore again (this destroys all current data, so only do this if you have a backup).

set -e  # Stop on any error

# Step 1: Check that a backup file was provided
if [ -z "$1" ]; then
    echo "Usage: ./deploy/scripts/db-restore.sh <backup-file>"
    echo ""
    echo "Available backups:"
    if [ -d "backups" ] && [ "$(ls -A backups/ 2>/dev/null)" ]; then
        ls -la backups/*.sql 2>/dev/null || echo "  (no .sql files found in backups/)"
    else
        echo "  (no backups found)"
    fi
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: File not found: $BACKUP_FILE"
    echo ""
    echo "Available backups:"
    if [ -d "backups" ] && [ "$(ls -A backups/ 2>/dev/null)" ]; then
        ls -la backups/*.sql 2>/dev/null || echo "  (no .sql files found in backups/)"
    else
        echo "  (no backups found)"
    fi
    exit 1
fi

# Step 2: Confirm before proceeding
echo "WARNING: This will overwrite the current database with the contents of:"
echo "  $BACKUP_FILE ($(wc -c < "$BACKUP_FILE" | tr -d ' ') bytes)"
echo ""
read -p "Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi
echo ""

# Step 3: Restore the database
echo "Restoring database from $BACKUP_FILE..."

# If using Docker (local development)
if docker ps | grep -q openconnect-postgres; then
    # Drop and recreate the database to ensure a clean restore
    docker exec openconnect-postgres dropdb -U openconnect --if-exists openconnect
    docker exec openconnect-postgres createdb -U openconnect openconnect
    docker exec -i openconnect-postgres psql -U openconnect openconnect < "$BACKUP_FILE"
# If using a direct connection (production)
elif [ -n "$DATABASE_URL" ]; then
    # Extract connection details for drop/create
    # For direct connections, we use psql to run the restore
    psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    psql "$DATABASE_URL" < "$BACKUP_FILE"
else
    echo "ERROR: No database connection found."
    echo "Either start Docker (docker compose up -d postgres) or set DATABASE_URL."
    exit 1
fi

echo ""
echo "Restore complete. The database now contains the data from:"
echo "  $BACKUP_FILE"
