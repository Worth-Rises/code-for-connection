#!/bin/bash
# deploy.sh
# Deploys Code for Connection to production using Docker Compose.
#
# What this does:
#   1. Checks that required environment variables are set
#   2. Asks for confirmation before proceeding
#   3. Builds Docker images for all services
#   4. Runs database migrations
#   5. Starts all services
#   6. Verifies the application is healthy
#
# Usage:
#   ./deploy/scripts/deploy.sh
#
# Prerequisites:
#   - Docker and Docker Compose installed and running
#   - A .env file in the project root with at least:
#       POSTGRES_PASSWORD=<a strong password>
#       JWT_SECRET=<a random string, at least 32 characters>
#
# What can go wrong:
#   - "POSTGRES_PASSWORD is not set": Create a .env file (see Prerequisites above)
#   - "Docker build fails": Check that Dockerfiles exist in deploy/docker/
#   - "Health check fails": Check logs with: docker compose -f deploy/docker/docker-compose.prod.yml logs
#   - "Port 80 in use": Another web server is running; stop it or change the port in docker-compose.prod.yml
#
# How to roll back:
#   If something goes wrong after deploying, you can revert to the previous version:
#
#   1. Stop the current deployment:
#      docker compose -f deploy/docker/docker-compose.prod.yml down
#
#   2. Check out the previous working version of the code:
#      git log --oneline -5          # Find the previous commit hash
#      git checkout <commit-hash>    # Switch to it
#
#   3. Rebuild and restart:
#      ./deploy/scripts/deploy.sh
#
#   4. If the database migration caused problems, restore from backup:
#      ./deploy/scripts/db-restore.sh backups/<your-backup>.sql

set -e  # Stop on any error

COMPOSE_FILE="deploy/docker/docker-compose.prod.yml"

echo "=== Code for Connection: Production Deploy ==="
echo ""

# Step 1: Check environment variables
echo "Checking configuration..."

if [ ! -f .env ]; then
    echo "ERROR: No .env file found."
    echo "Create one with at least POSTGRES_PASSWORD and JWT_SECRET."
    echo "See .env.example for a template."
    exit 1
fi

# Load .env so we can check values
set -a
source .env
set +a

if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "ERROR: POSTGRES_PASSWORD is not set in .env"
    echo "Add a strong password: POSTGRES_PASSWORD=your-password-here"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "ERROR: JWT_SECRET is not set in .env"
    echo "Add a random string (32+ characters): JWT_SECRET=your-secret-here"
    exit 1
fi

if [ ${#JWT_SECRET} -lt 32 ]; then
    echo "WARNING: JWT_SECRET is shorter than 32 characters."
    echo "For production, use a longer secret for better security."
fi

if ! docker info &> /dev/null; then
    echo "ERROR: Docker is not running. Start Docker and try again."
    exit 1
fi

echo "Configuration looks good."
echo ""

# Step 2: Confirm deployment
echo "This will build and deploy Code for Connection to production."
echo "Compose file: $COMPOSE_FILE"
echo ""
read -p "Continue? (y/N) " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Deploy cancelled."
    exit 0
fi
echo ""

# Step 3: Back up the database (if it's currently running)
if docker ps --format '{{.Names}}' | grep -q openconnect-postgres 2>/dev/null; then
    echo "Existing database found. Creating a backup before deploying..."
    if [ -f deploy/scripts/db-backup.sh ]; then
        bash deploy/scripts/db-backup.sh "pre-deploy-$(date +%Y-%m-%d-%H-%M-%S)"
    else
        echo "WARNING: db-backup.sh not found. Skipping backup."
    fi
    echo ""
fi

# Step 4: Build Docker images
echo "Building Docker images (this may take several minutes)..."
docker compose -f "$COMPOSE_FILE" build
echo "Build complete."
echo ""

# Step 5: Run database migrations
echo "Starting database for migrations..."
docker compose -f "$COMPOSE_FILE" up -d postgres
echo "Waiting for PostgreSQL to be ready..."
sleep 10

echo "Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm api npx prisma migrate deploy
echo "Migrations complete."
echo ""

# Step 6: Start all services
echo "Starting all services..."
docker compose -f "$COMPOSE_FILE" up -d
echo ""

# Step 7: Health check
echo "Checking that services are running..."
sleep 10

SERVICES_RUNNING=true
for SERVICE in postgres redis api signaling web; do
    STATUS=$(docker compose -f "$COMPOSE_FILE" ps --format '{{.State}}' "$SERVICE" 2>/dev/null || echo "missing")
    if echo "$STATUS" | grep -qi "running"; then
        echo "  $SERVICE: running"
    else
        echo "  $SERVICE: $STATUS (problem)"
        SERVICES_RUNNING=false
    fi
done

echo ""
if [ "$SERVICES_RUNNING" = true ]; then
    echo "=== Deploy Complete ==="
    echo ""
    echo "The application is running at http://localhost"
    echo ""
    echo "Useful commands:"
    echo "  View logs:      docker compose -f $COMPOSE_FILE logs -f"
    echo "  Stop services:  docker compose -f $COMPOSE_FILE down"
    echo "  Restart:        docker compose -f $COMPOSE_FILE restart"
else
    echo "=== Deploy finished with warnings ==="
    echo ""
    echo "Some services may not be running correctly."
    echo "Check the logs for details:"
    echo "  docker compose -f $COMPOSE_FILE logs"
fi
