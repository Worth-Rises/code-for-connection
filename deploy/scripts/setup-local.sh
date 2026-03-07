#!/bin/bash
# setup-local.sh
# Sets up Code for Connection for local development from a fresh clone.
#
# What this does:
#   1. Checks that required tools are installed (node, docker, npm)
#   2. Copies the environment config file
#   3. Starts PostgreSQL and Redis in Docker
#   4. Installs Node.js dependencies
#   5. Builds shared packages
#   6. Creates database tables
#   7. Loads sample data
#   8. Starts the application
#
# Usage:
#   chmod +x deploy/scripts/setup-local.sh
#   ./deploy/scripts/setup-local.sh
#
# What can go wrong:
#   - "Docker not running": Start Docker Desktop first
#   - "Port 5432 in use": Another PostgreSQL is running; stop it or change the port in docker-compose.yml
#   - "npm install fails": Try deleting node_modules/ and package-lock.json, then re-run this script
#   - "prisma migrate fails": Make sure PostgreSQL is running (docker ps) and DATABASE_URL is correct in .env

set -e  # Stop on any error

echo "=== Code for Connection: Local Setup ==="
echo ""

# Step 1: Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "Install it from https://nodejs.org (version 20 or later)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "ERROR: Node.js 20+ required. You have $(node -v)"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed."
    echo "Install Docker Desktop from https://docker.com"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "ERROR: Docker is installed but not running."
    echo "Start Docker Desktop and try again."
    exit 1
fi

echo "All prerequisites met."
echo ""

# Step 2: Environment config
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    # Set the database URL to match docker-compose defaults
    if command -v sed &> /dev/null; then
        sed -i.bak 's|DATABASE_URL=changeme|DATABASE_URL=postgresql://openconnect:hackathon2026@localhost:5432/openconnect|' .env
        sed -i.bak 's|JWT_SECRET=changeme|JWT_SECRET=local-dev-secret-change-in-production|' .env
        rm -f .env.bak
    fi
    echo "Created .env with local development defaults."
else
    echo ".env already exists, skipping."
fi
echo ""

# Step 3: Start database and cache
echo "Starting PostgreSQL and Redis..."
docker compose up -d postgres redis
echo "Waiting for databases to be ready..."
sleep 5
echo ""

# Step 4: Install dependencies
echo "Installing Node.js dependencies (this may take a minute)..."
npm install
echo ""

# Step 5: Build shared packages
echo "Building shared packages..."
npm run build -w @openconnect/shared
npm run build -w @openconnect/ui
echo ""

# Step 6: Database setup
echo "Setting up database tables..."
npx prisma migrate dev --name init
echo ""

# Step 7: Seed data
echo "Loading sample data..."
npm run db:seed
echo ""

# Step 8: Done
echo "=== Setup Complete ==="
echo ""
echo "To start the application:"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:5173 in your browser."
echo ""
echo "Test accounts:"
echo "  Admin:        admin@nydocs.gov / admin123"
echo "  Incarcerated: PIN 1234"
echo "  Family:       alice@example.com / password123"
