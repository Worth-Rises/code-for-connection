# Code for Connection - Hackathon Documentation

Welcome to the Code for Connection hackathon! This documentation will help you get started with building your component.

## Quick Links

- [API Contracts](./api-contracts.md) - Cross-team API specifications
- [Database Schema](./database-schema.md) - Shared database reference
- [Team Guides](./team-guides.md) - Per-team setup and feature guides

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Git

### Setup

```bash
# Clone the repo
git clone https://github.com/wildcard-dev/code-for-connection.git
cd code-for-connection

# Checkout your team's branch
git checkout guild/voice  # or guild/video, guild/messaging, guild/admin

# Start shared services
docker-compose up -d

# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Seed the database
npm run db:seed

# Start development
npm run dev
```

### Development URLs

- **Web App**: http://localhost:5173
- **API Gateway**: http://localhost:3000
- **Signaling Server**: http://localhost:3001

### Login Credentials

**Incarcerated Users (PIN Login):**
- PIN: 1234, 5678, 9012, 3456, 7890, 2345, 6789, 0123, 4567, 8901

**Family Members:**
- alice@example.com / password123
- bob@example.com / password123

**Admin Users:**
- admin@nydocs.gov / admin123 (Agency Admin)
- admin@singsingcf.gov / admin123 (Facility Admin)

## Project Structure

```
code-for-connection/
├── packages/
│   ├── shared/     # Shared types, auth, database client
│   └── ui/         # Shared UI components
├── services/
│   ├── api-gateway/  # Main Express API server
│   └── signaling/    # WebRTC signaling server
├── apps/
│   ├── web/        # Main React application
│   └── tablet/     # Tablet-optimized build
├── guilds/
│   ├── voice/      # Voice calling team
│   ├── video/      # Video calling team
│   ├── messaging/  # Messaging team
│   └── admin/      # Admin platform team
└── prisma/         # Database schema and migrations
```

## Rules

1. **Work in your team's directory**: `guilds/<your-team>/`
2. **Work on your team's branch**: `guild/voice`, `guild/video`, etc.
3. **Don't modify shared files** without coordination
4. **Use the shared Prisma client** from `@openconnect/shared`
5. **Commit and push often**

## Support

Ask a facilitator if you need help!
