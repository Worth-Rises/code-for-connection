<p align="center">
  <img width="1600" height="400" alt="code-for-connection-logo" src="https://github.com/user-attachments/assets/70d0c13c-b6c1-4a90-8bcd-ec82d45280a8" />
</p>


# Code for Connection - Hackathon Documentation

Welcome to the Code for Connection hackathon! This documentation will help you get started with building your component.

## Quick Links

- [API Contracts](./api-contracts.md) - Cross-team API specifications
- [Database Schema](./database-schema.md) - Shared database reference
- [Guild Guides](./guild-guides.md) - Per-guild setup and feature guides

## Getting Started
//test

### Prerequisites

You need these tools installed before starting. Click the links to download if you don't have them.

- **[Node.js 20+](https://nodejs.org/)** — JavaScript runtime. After installing, verify with `node --version` (should show `v20.x.x` or higher).
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** — runs the database and Redis locally in containers. Make sure Docker Desktop is open and running before the setup steps.
- **Git** — for cloning the repo. Verify with `git --version`. Most machines have this already; if not, install from [git-scm.com](https://git-scm.com/).

> **Not sure if you have these?** Run `node --version`, `docker --version`, and `git --version` in your terminal. If a command is not found, follow the install link above.

### Setup

```bash
# Clone the repo
git clone https://github.com/wildcard-dev/code-for-connection.git
cd code-for-connection

# Checkout your team's branch
git checkout guild/voice  # or guild/video, guild/messaging, guild/admin

# Copy environment file and fill in values
cp .env.example .env
# The default values in .env match docker-compose.yml — no changes needed for local dev

# Start shared services (postgres and redis only — signaling runs locally via npm run dev)
docker compose up -d postgres redis

# Install dependencies
npm install

# Build shared packages (required before first run)
npm run build -w @openconnect/shared
npm run build -w @openconnect/ui

# Run database migrations
# Note: use --name to avoid an interactive prompt
npx prisma migrate dev --name init

# Seed the database
npm run db:seed

# Start development
npm run dev
```

### Development URLs

- **Web App** (family & admin): http://localhost:5173
- **Tablet App** (incarcerated users): http://localhost:5174
- **API Gateway**: http://localhost:3000
- **Signaling Server**: http://localhost:3001

### Tablet Emulator

The tablet app (`apps/tablet/`) is a separate build targeting the JP6 correctional tablet at **1280x800** resolution. Incarcerated users only interact with this interface — not the main web app.

**Running the tablet app:**
```bash
# In a separate terminal alongside npm run dev
npm run dev:tablet
```
Then open http://localhost:5174 in your browser.

**Simulating the tablet screen size in Chrome:**

1. Open http://localhost:5174 in Chrome
2. Open DevTools: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows)
3. Click the **device toolbar icon** (looks like a phone/tablet) or press `Cmd+Shift+M` / `Ctrl+Shift+M`
4. In the dimensions bar at the top, select **Responsive** and set the size to **1280 x 800**
5. You can also select **Landscape** orientation

> **Why a separate app?** The tablet UI is intentionally stripped down — larger touch targets, no keyboard-reliant inputs, and optimized for a locked-down Android environment. Importantly, **you do not write incarcerated UI code twice** — both the tablet and web apps load the same components from `guilds/<name>/ui/incarcerated/`. Build there once and it works in both.

### Login Credentials

- **Incarcerated users**: http://localhost:5174/login (tablet app — run `npm run dev:tablet` first)
- **Family & admin**: http://localhost:5173/login (web app)

**Incarcerated Users (PIN Login):**
- 1234 (John Doe, Sing Sing)
- 5678 (Michael Smith, Sing Sing)
- 9012 (Robert Johnson, Sing Sing)
- 3456 (David Williams, Sing Sing)
- 7890 (James Brown, Sing Sing)
- 2345 (Sarah Davis, Bedford Hills)
- 6789 (Emily Miller, Bedford Hills)
- 0123 (Jessica Wilson, Bedford Hills)
- 4567 (Amanda Moore, Bedford Hills)
- 8901 (Michelle Taylor, Bedford Hills)

**Family Members:**
- alice@example.com / password123
- bob@example.com / password123
- carol@example.com / password123
- diana@example.com / password123
- eva@example.com / password123
- frank@example.com / password123
- grace@example.com / password123
- attorney@lawfirm.com / password123

**Admin Users:**
- admin@nydocs.gov / admin123 (Agency Admin)
- admin@singsingcf.gov / admin123 (Sing Sing Facility Admin)
- admin@bedfordhillscf.gov / admin123 (Bedford Hills Facility Admin)

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

1. **Work in your guild's directory**: `guilds/<your-guild>/`
2. **Work on your guild's branch**: `guild/voice`, `guild/video`, etc.
3. **Don't modify shared files** without coordination
4. **Use the shared Prisma client** from `@openconnect/shared`
5. **Commit and push often**

## Troubleshooting

**"Cannot find module '@openconnect/shared/dist/index.js'"**
You need to build the shared packages before running the dev server:
```bash
npm run build -w @openconnect/shared
npm run build -w @openconnect/ui
```

**"Failed to resolve entry for package '@openconnect/ui'" in Vite**
Same fix as above — run the two build commands then restart `npm run dev`.

**"EADDRINUSE: address already in use :::3001" (or 3000/5173)**
A previous dev session left a process running. Kill it and restart:
```bash
lsof -ti:3000,3001,5173 | xargs kill -9
npm run dev
```

**`npm run db:migrate` hangs waiting for input**
It's prompting for a migration name. Use this instead:
```bash
npx prisma migrate dev --name init
```

**Facility dropdown is empty on /pin-login**
The API gateway needs to have the admin router mounted. This is already done in the starter — if you're seeing it, make sure your branch is up to date with `main`.

**`docker-compose` command not found**
Newer Docker Desktop versions use `docker compose` (no hyphen). Replace `docker-compose` with `docker compose` in all commands.

**Database errors after switching branches**
If the schema changed, reset and re-seed:
```bash
npm run db:reset
npm run db:seed
```

## Support & Community

Join the hackathon Slack: **[slack.com/code-for-connection](https://join.slack.com/t/codeforconnection/shared_invite/zt-3rv1g0c2e-nWESP6Uv25vWAhRL4aobJg)**

Once you're in, head to your guild's channel:
- Voice Guild → `#guild-voice`
- Video Guild → `#guild-video`
- Messaging Guild → `#guild-messaging`
- Admin Platform Guild → `#guild-admin`

For technical questions, post in `#tech-help`. Facilitators will be monitoring throughout both days.
