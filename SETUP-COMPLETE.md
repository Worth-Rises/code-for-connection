# ✅ Setup Complete!

Your PostgreSQL database is now fully set up and running.

## What's Running

- **PostgreSQL**: `localhost:5432`
  - Database: `openconnect`
  - User: `openconnect`
  - Password: `hackathon2026`

- **Redis**: `localhost:6379`

## Database Status

✅ Schema applied (all tables created)
✅ Seeded with test data
✅ Prisma Client generated

## Quick Commands

### View Database
```bash
npm run db:studio
```
Opens Prisma Studio at http://localhost:5555 to browse your data visually.

### Start Development
```bash
npm run dev
```
Starts all services:
- API Gateway: http://localhost:3000
- Signaling Server: http://localhost:3001
- Web App: http://localhost:5173
- Tablet App: http://localhost:5174 (run `npm run dev:tablet` separately)

### Docker Management
```bash
# Stop containers
docker-compose down

# Start containers
docker-compose up -d postgres redis

# View logs
docker-compose logs -f postgres
```

## Test Credentials

### Incarcerated Persons (PIN login at tablet app)
- John Doe (SS-001): `1234`
- Michael Smith (SS-002): `5678`
- Sarah Davis (BH-001): `2345`

### Family Members (email/password login at web app)
- alice@example.com / password123
- bob@example.com / password123
- eva@example.com / password123

### Admin Users
- Agency Admin: admin@nydocs.gov / admin123
- Sing Sing Admin: admin@singsingcf.gov / admin123

## Database Structure

The database contains:
- **1 Agency**: New York State DOCS
- **2 Facilities**: Sing Sing, Bedford Hills
- **10 Incarcerated Persons**: 5 per facility
- **8 Family Members**
- **3 Admin Users**
- **13 Approved Contacts**
- **Video/Voice Call history**
- **Message conversations**

## Next Steps

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open the web app**: http://localhost:5173

3. **Open the tablet app**: http://localhost:5174 (after running `npm run dev:tablet`)

4. **Explore the database**: Run `npm run db:studio`

## Useful Prisma Commands

```bash
# Generate Prisma Client (after schema changes)
npm run db:generate

# Create a new migration (after schema changes)
npx prisma migrate dev --name your_migration_name

# Reset database (WARNING: deletes all data)
npm run db:reset

# Apply migrations to production
npm run db:migrate:deploy
```

## Project Structure

```
code-for-connection/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seed data script
│   └── migrations/            # Migration history
├── packages/
│   ├── shared/                # Shared types, Prisma client, auth
│   └── ui/                    # Shared UI components
├── services/
│   ├── api-gateway/           # Main REST API
│   └── signaling/             # WebRTC signaling server
├── apps/
│   ├── web/                   # Family & admin web app
│   └── tablet/                # Incarcerated persons tablet app
└── guilds/
    ├── voice/                 # Voice calling features
    ├── video/                 # Video calling features
    ├── messaging/             # Messaging features
    └── admin/                 # Admin features
```

---

**Need help?** Check the docs:
- [API Contracts](./docs/api-contracts.md)
- [Guild Guides](./docs/guild-guides.md)
- [README](./docs/README.md)
