# Code for Connection: Admin Guild (Chris's Fork)

## What This Is

This fork implements the **admin guild** and all three **communication guild frontends** (voice, video, messaging) for the Code for Connection platform, a correctional facility communication system.

The platform connects incarcerated people with their families through voice calls, video visits, and messaging, with administrative oversight at every layer.

## Architecture at a Glance

```
User roles:          incarcerated  |  family  |  facility_admin  |  agency_admin
                          |              |              |                  |
Frontend apps:       [Tablet UI]    [Web UI]     [Admin Portal]    [Admin Portal]
                          |              |              |                  |
API layer:           [API Gateway: Express + Prisma]                      |
                          |              |              |                  |
Guild backends:      /api/voice    /api/video   /api/messaging    /api/admin
                          |              |              |                  |
Data layer:          [PostgreSQL]                [Redis]           [Signaling Server]
```

### The Guild Pattern

The codebase uses a "guild" architecture: each feature domain (voice, video, messaging, admin) is a self-contained module with its own API routes and UI components. Guilds communicate through the shared Prisma database and the API gateway.

```
guilds/{name}/
  api/routes.ts           -- Express router, mounted at /api/{name}
  ui/admin/index.tsx      -- Admin view (facility staff)
  ui/incarcerated/index.tsx -- Tablet view (incarcerated users)
  ui/family/index.tsx     -- Web view (family members)
```

This separation means each guild team can work independently without merge conflicts. The admin guild is special: it provides the dashboard and management UI that oversees all other guilds.

### Shared Infrastructure

Three hooks live in `guilds/shared/hooks/` and are used across all communication guilds:

- **useGuildApi(basePath)**: Authenticated fetch wrapper. A generalization of the admin guild's `useAdminApi` that takes a configurable base path (`/api/voice`, `/api/video`, `/api/messaging`).
- **useSocket()**: Socket.IO connection to the signaling server for real-time call events (join-room, leave-room, mute-toggle, etc.).
- **useCallTimer(seconds)**: Countdown timer with warning threshold for call duration limits. Returns formatted time, warning state, and expired state.

## What Each Guild Does

### Admin Guild (`guilds/admin/`)
The control center. Dashboard with aggregate stats, contact approval workflows, blocked number management, user search, and facility configuration.

**Key pattern**: Uses `useFacilityScope()` to handle the two admin roles. Facility admins see only their facility; agency admins get a facility selector dropdown.

### Voice Guild (`guilds/voice/`)
Phone calls between incarcerated people and family members.

- **Admin**: Live active calls table, terminate capability, call logs with pagination
- **Incarcerated**: Contact list with large touch targets, call initiation, 15-minute timer with 1-minute warning
- **Family**: Polls for incoming calls every 5 seconds, accept/decline modal, call history

### Video Guild (`guilds/video/`)
Scheduled video visits with an approval workflow.

- **Admin**: Pending visit request queue (approve/deny), active session monitoring, call logs
- **Incarcerated**: Scheduled calls list, join button (enabled within 5 min of start), placeholder camera view with 30-minute timer
- **Family**: Request visit form, scheduled visits list, join call

### Messaging Guild (`guilds/messaging/`)
Asynchronous text messaging with content moderation.

- **Admin**: Message review queue (approve/block), message logs
- **Incarcerated**: Conversation list, chat thread with status indicators (reviewing, approved, delivered, read), 5-second polling
- **Family**: Same chat interface, desktop-width layout

## Data Model (Key Tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| IncarceratedPerson | Resident profiles | firstName, lastName, pin, facilityId, housingUnitId |
| FamilyMember | Family accounts | email, phone, firstName, lastName |
| AdminUser | Staff accounts | role (facility_admin, agency_admin), facilityId |
| ApprovedContact | Resident-family relationships | status (pending, approved, denied) |
| VoiceCall | Phone call records | status (ringing, connected, completed, terminated_by_admin) |
| VideoCall | Video visit records | status (requested, approved, scheduled, in_progress, completed) |
| Conversation | Message threads | incarceratedPersonId, familyMemberId, isBlocked |
| Message | Individual messages | senderType, body, status (pending_review, approved, delivered, read) |

## Branches

| Branch | What It Contains |
|--------|-----------------|
| `guild-admin-chris` | Admin guild + shared hooks + backend endpoints + API gateway |
| `admin-voice-chris` | Voice guild frontend (admin, incarcerated, family) |
| `admin-video-chris` | Video guild frontend (admin, incarcerated, family) |
| `admin-messaging-chris` | Messaging guild frontend (admin, incarcerated, family) |

## Running Locally

```bash
# Prerequisites: Node.js 20+, Docker Desktop running

# Start database and cache
docker compose up -d postgres redis

# Install and build
npm install
npm run build -w @openconnect/shared
npm run build -w @openconnect/ui

# Database setup
npx prisma migrate dev --name init
npm run db:seed

# Start everything (API + signaling server + web app)
npm run dev
```

### Test Credentials

**Admin**: admin@nydocs.gov / admin123 (agency admin, sees all facilities)
**Incarcerated**: PIN 1234 (John Doe, Sing Sing)
**Family**: alice@example.com / password123

### URLs

- Web app: http://localhost:5173
- API: http://localhost:3000
- Signaling: http://localhost:3001

## How the Pieces Fit Together

When an incarcerated person initiates a voice call:

1. Tablet UI calls `POST /api/voice/initiate-call` with the family member ID
2. Backend creates a VoiceCall record with status `ringing`, returns a `roomId`
3. Incarcerated UI connects to the signaling server, emits `join-room` with the roomId
4. Family UI (polling `/api/voice/my-calls?status=ringing` every 5s) sees the incoming call
5. Family accepts, joins the same signaling room
6. Both sides see "Connected", the call timer starts
7. Admin dashboard (polling `/api/voice/active-calls` every 10s) shows the call in the active table
8. Admin can terminate by calling `POST /api/voice/terminate-call/:callId`

Video visits follow a similar pattern but with a scheduling/approval step first. Messaging is simpler: messages go through a pending_review state before delivery (no real-time signaling needed, just polling).

## Contributing

This fork is maintained by Chris Wiggins and collaborators (sarahtrefethen, geocas38, EricSchles, DumbInACan). PRs go to Worth-Rises/code-for-connection.
