# Code for Connection: System Architecture

## What This System Does

Code for Connection is a communication platform for correctional facilities.
It lets incarcerated people make phone calls, join video visits, and exchange
text messages with their family members. Every interaction flows through
facility staff, who can approve, monitor, and terminate communications as
needed. The system serves four types of users across web browsers and
facility-issued tablets.


## Glossary

These acronyms appear throughout the codebase and this document:

| Term    | What It Means |
|---------|---------------|
| API     | Application Programming Interface: a set of rules that lets one program talk to another over a network |
| JWT     | JSON Web Token: a small, signed piece of data that proves who a user is (like a digital ID badge) |
| ORM     | Object-Relational Mapping: a tool that lets code talk to a database using regular programming objects instead of raw database queries |
| PSTN    | Public Switched Telephone Network: the regular phone system (landlines and cell phones) |
| SQL     | Structured Query Language: the standard language for reading and writing data in a database |
| WebRTC  | Web Real-Time Communication: a browser technology that lets two people send audio and video directly to each other |
| Socket  | A persistent two-way connection between a browser and a server, used for real-time updates |
| Redis   | An in-memory data store used here to coordinate real-time events across server instances |
| Prisma  | The specific ORM this project uses to talk to the PostgreSQL database |


## User Roles

The system has four roles. Each role sees a different interface.

| Role             | Who They Are                              | How They Access the System      |
|------------------|-------------------------------------------|---------------------------------|
| incarcerated     | Person in a correctional facility         | Facility-issued tablet          |
| family           | Family member or attorney outside         | Web browser on personal device  |
| facility_admin   | Staff member at one specific facility     | Web dashboard                   |
| agency_admin     | Staff overseeing all facilities in a state| Web dashboard                   |

Agency admins can see and manage everything across all facilities.
Facility admins can only see data for their assigned facility.


## Services Overview

The system runs three services, plus two data stores. Here is how they
connect:

```
+-------------------+         +-------------------+
|                   |         |                   |
|   Web App         |  HTTP   |   API Gateway     |
|   (Vite/React)    +-------->|   (Express)       |
|                   |         |                   |
|   Port 5173       |         |   Port 3000       |
|   Browser UI      |         |   All business    |
|                   |         |   logic and        |
+--------+----------+         |   database calls  |
         |                    |                   |
         |                    +--------+----------+
         |                             |
         |  WebSocket                  | SQL queries
         |  (real-time)                | via Prisma ORM
         v                             v
+-------------------+         +-------------------+
|                   |         |                   |
|  Signaling Server |         |   PostgreSQL      |
|  (Socket.IO)      |         |   Database        |
|                   |         |                   |
|  Port 3001        |         |   Port 5432       |
|  Call setup and   |         |   All persistent  |
|  real-time events |         |   data            |
|                   |         |                   |
+--------+----------+         +-------------------+
         |
         | Pub/Sub
         v
+-------------------+
|                   |
|   Redis           |
|                   |
|   Port 6379       |
|   Coordinates     |
|   events across   |
|   server instances|
|                   |
+-------------------+
```

**Web App** (port 5173): The browser application that all users interact
with. Built with React (a user interface library) and served by Vite (a
development server). Contains separate page layouts for each user role.

**API Gateway** (port 3000): The backend server that handles all data
operations. When a user takes an action (send a message, start a call), the
web app sends an HTTP request here. The gateway checks the user's JWT token,
verifies their role, then reads from or writes to the database. Built with
Express (a web server framework for Node.js).

**Signaling Server** (port 3001): Handles real-time communication during
calls. When two people join a video or voice call, this server helps their
browsers find each other and establish a direct WebRTC connection. Uses
Socket.IO (a library for persistent two-way connections) and Redis to
coordinate events.

**PostgreSQL** (port 5432): The relational database that stores all
persistent data: user accounts, call records, messages, facility
configuration, contact lists, and blocked numbers. The codebase talks to it
through Prisma, an ORM that translates code into SQL queries.

**Redis** (port 6379): An in-memory data store that the signaling server
uses to coordinate real-time events. If you run multiple copies of the
signaling server (for reliability), Redis makes sure a message sent to one
copy reaches users connected to a different copy.


## Voice Call Flow

Voice calls are phone calls. The incarcerated person initiates from a
tablet, and the call is bridged to the family member's regular phone via
Twilio (a third-party phone service) and the PSTN.

```
  Tablet                API Gateway           Twilio/PSTN        Family Phone
    |                       |                     |                    |
    | 1. POST /initiate-call|                     |                    |
    |---------------------->|                     |                    |
    |                       | 2. Check: contact   |                    |
    |                       |    approved? Number  |                    |
    |                       |    not blocked?      |                    |
    |                       |    Within calling    |                    |
    |                       |    hours?            |                    |
    |                       |                     |                    |
    |                       | 3. Create call       |                    |
    |                       |    record (ringing)  |                    |
    |                       |                     |                    |
    |                       | 4. Bridge call ----->| 5. Ring phone ---->|
    |                       |                     |                    |
    |                       |                     |    6. Answer        |
    |                       |<----- connected ----|<-------------------|
    |                       |                     |                    |
    | 7. Call in progress   |                     |                    |
    |<=====================>|<===================>|<==================>|
    |                       |                     |                    |
    | 8. Time limit OR      |                     |                    |
    |    admin terminates   |                     |                    |
    |    OR either party    |                     |                    |
    |    hangs up           |                     |                    |
    |                       |                     |                    |
    |                       | 9. Update record    |                    |
    |                       |    (completed or    |                    |
    |                       |     terminated)     |                    |
```

**Step by step:**

1. The incarcerated person picks a contact on their tablet and taps "Call."
2. The API Gateway checks that the contact is approved, the phone number is
   not on any blocked list, and the current time is within the housing
   unit's allowed calling hours.
3. A new voice call record is created in the database with status "ringing."
4. Twilio places an outbound call to the family member's phone number.
5. The family member's phone rings.
6. The family member answers.
7. Audio flows between the tablet and the phone.
8. The call ends when: the time limit is reached, an admin clicks
   "Terminate" on their dashboard, or either party hangs up.
9. The call record is updated with the end time, duration, and who ended it.

**Admin capabilities during voice calls:**
- View all active calls in their facility in real time
- Terminate any active call immediately
- Review call logs with date and participant filters


## Video Call Flow

Video calls use WebRTC, which means audio and video travel directly between
the two browsers (not through our servers). The signaling server only helps
set up the connection.

```
  Family           API Gateway        Admin           Signaling        Tablet
    |                  |                |                 |               |
    | 1. POST          |                |                 |               |
    |  /request-visit  |                |                 |               |
    |----------------->|                |                 |               |
    |                  | 2. Create call |                 |               |
    |                  |   (requested)  |                 |               |
    |                  |                |                 |               |
    |                  | 3. Appears in  |                 |               |
    |                  |    pending --->|                 |               |
    |                  |    requests    |                 |               |
    |                  |                |                 |               |
    |                  |  4. Approve    |                 |               |
    |                  |<---------------|                 |               |
    |                  |                |                 |               |
    |                  | 5. Status ->   |                 |               |
    |                  |    "scheduled" |                 |               |
    |                  |                |                 |               |
    |        ... time passes until scheduled start ...                   |
    |                  |                |                 |               |
    | 6. POST          |                |                 |               |
    |  /join-call      |                |                 |               |
    |----------------->|                |                 |               |
    |                  |                |                 |               |
    | 7. join-room ----|----------------|---------------->|               |
    |                  |                |                 |<-- join-room -|
    |                  |                |                 |    8.         |
    |                  |                |                 |               |
    | 9. WebRTC offer/answer exchange via signaling       |               |
    |<--------------------------------------------------->|               |
    |                  |                |                 |               |
    | 10. Direct video/audio between browsers             |               |
    |<====================================================>|              |
    |                  |                |                 |               |
    |  11. Call ends (time limit, admin, or either party) |               |
```

**Step by step:**

1. The family member logs in to the web app and requests a video visit,
   picking a time slot.
2. A video call record is created in the database with status "requested."
3. The request appears on the facility admin's dashboard under "Pending
   Requests."
4. The admin reviews and approves (or denies) the request.
5. If approved, the status changes to "scheduled."
6. At the scheduled time, both parties click "Join" in the web app.
7. The family member's browser connects to the signaling server and joins a
   room.
8. The incarcerated person's tablet does the same.
9. The signaling server relays WebRTC "offer" and "answer" messages so the
   two browsers can find each other.
10. Once connected, video and audio flow directly between the two browsers.
11. The call ends when the time limit is reached, an admin terminates it, or
    either party leaves.

**Admin capabilities during video calls:**
- View all active video calls
- Approve or deny visit requests
- Terminate any active call
- Review call history and statistics


## Message Lifecycle

All text messages pass through an admin review step before delivery. This is
a core compliance requirement.

```
+----------+     +--------------+     +--------------+     +----------+
|          |     |              |     |              |     |          |
|  Sender  |---->| pending_review|--->|   approved   |---->| delivered|
|  writes  |     |              |     |   (admin)    |     |          |
|  message |     |  Waiting for |     |              |     +----+-----+
|          |     |  admin       |     +--------------+          |
+----------+     |  review      |            |                  v
                 |              |            |            +----------+
                 +--------------+            |            |          |
                        |                    v            |   read   |
                        |             +--------------+    |          |
                        +------------>|   blocked    |    +----------+
                          (admin      |   (rejected) |
                           rejects)   +--------------+
```

**Step by step:**

1. Either the incarcerated person or the family member writes a message.
2. The message is saved to the database with status "pending_review."
3. The message appears in the admin's review queue.
4. The admin reads the message and either approves or blocks it.
5. If approved, the message becomes visible to the recipient.
6. When the recipient opens the conversation, the status updates to "read."

Messages can include image attachments. Attachments go through their own
review process (pending_review, approved, or rejected).

Admins can also block an entire conversation, which prevents any further
messages between those two people.


## Directory Map

The codebase is organized as a monorepo (one repository containing multiple
projects that share code). Here is what each top-level directory contains:

```
code-for-connection/
|
|-- guilds/                  Feature modules (the main application code)
|   |-- admin/               Dashboard features: user management, contacts,
|   |   |-- api/routes.ts      blocked numbers, facility configuration
|   |   |-- ui/index.tsx
|   |
|   |-- voice/               Phone call features
|   |   |-- api/routes.ts    Backend: initiate calls, active call list,
|   |   |-- ui/                terminate, call logs, stats
|   |   |   |-- admin/       Admin sees active calls and logs
|   |   |   |-- family/      Family sees call history
|   |   |   |-- incarcerated/ Incarcerated person sees contacts and dialer
|   |
|   |-- video/               Video visit features
|   |   |-- api/routes.ts    Backend: request visits, approve/deny,
|   |   |-- ui/                join calls, terminate, stats
|   |   |   |-- admin/       Admin sees requests and active calls
|   |   |   |-- family/      Family requests visits and joins calls
|   |   |   |-- incarcerated/ Incarcerated person sees schedule and joins
|   |
|   |-- messaging/           Text messaging features
|   |   |-- api/routes.ts    Backend: send messages, review queue,
|   |   |-- ui/                approve/block, conversation list
|   |   |   |-- admin/       Admin sees review queue
|   |   |   |-- family/      Family sees conversations
|   |   |   |-- incarcerated/ Incarcerated person sees conversations
|   |
|   |-- shared/hooks/        Shared frontend utilities
|       |-- useGuildApi.ts   Makes HTTP requests to the API Gateway
|       |-- useSocket.ts     Manages signaling server connections
|       |-- useCallTimer.ts  Tracks call duration and time limits
|
|-- packages/
|   |-- shared/              Code shared across all services
|   |   |-- src/auth/        JWT token creation, verification, and
|   |   |                      role-checking middleware
|   |   |-- src/db/          Database client (Prisma) setup
|   |   |-- src/types/       Data type definitions
|   |   |-- src/utils/       Error handling, pagination, date helpers
|   |
|   |-- ui/                  Shared visual components (buttons, cards,
|                              modals, form inputs, etc.)
|
|-- apps/
|   |-- web/                 The browser application: URL routing,
|                              page layouts, role-based navigation
|
|-- services/
|   |-- api-gateway/         Express server (port 3000) that mounts
|   |   |-- src/               all guild routers under /api/*
|   |   |   |-- routes/auth  Login and token endpoints
|   |
|   |-- signaling/           Socket.IO server (port 3001) for
|                              real-time call events and WebRTC setup
|
|-- prisma/
|   |-- schema.prisma        Database table definitions (the source
|                              of truth for all data structures)
|
|-- deploy/                  Docker, Terraform, and deployment scripts
|-- docker-compose.yml       Runs PostgreSQL, Redis, and the signaling
                               server in containers for local development
```


## How the Pieces Connect

Each guild follows the same pattern:

- **Backend** (`guilds/{name}/api/routes.ts`): Defines the HTTP endpoints
  (URLs) that the API Gateway serves. Every route checks authentication
  (is this a valid user?) and authorization (does this user's role allow
  this action?) using middleware from `packages/shared`.

- **Frontend** (`guilds/{name}/ui/{role}/index.tsx`): Defines what each
  user role sees for that feature. The admin view for voice calls shows
  active calls and logs. The incarcerated view shows a contact list and
  dial button.

The API Gateway (`services/api-gateway`) imports all guild routers and
mounts them:
- `/api/auth` for login and token management
- `/api/admin` for the admin guild
- `/api/voice` for the voice guild
- `/api/video` for the video guild
- `/api/messaging` for the messaging guild


## Authentication Flow

1. A user logs in by sending their credentials to `/api/auth`.
2. The server verifies the credentials and returns a JWT (JSON Web Token).
3. The browser stores this token and includes it in every subsequent request
   as an `Authorization` header.
4. On each request, the `requireAuth` middleware extracts the token, verifies
   it, and attaches the user's identity (id, role, facility) to the request.
5. The `requireRole` middleware then checks whether the user's role is
   allowed for that specific endpoint.

Agency admins can access data across all facilities. Facility admins are
restricted to their assigned facility. Incarcerated users and family members
can only access their own data.


## Data Model (Key Tables)

The database schema lives in `prisma/schema.prisma`. Here are the most
important tables and how they relate:

```
Agency (e.g., "State DOC")
  |
  +-- Facility (e.g., "North Regional")
  |     |
  |     +-- HousingUnit (e.g., "Block A")
  |     |     |
  |     |     +-- IncarceratedPerson
  |     |
  |     +-- AdminUser (facility_admin)
  |     +-- VoiceCall
  |     +-- VideoCall
  |     +-- VideoCallTimeSlot
  |     +-- BlockedNumber
  |
  +-- AdminUser (agency_admin)
  +-- HousingUnitType (calling rules: hours, duration limits, max contacts)

FamilyMember (independent of facility)
  |
  +-- ApprovedContact (links a family member to an incarcerated person)
  +-- Conversation
        |
        +-- Message
              |
              +-- MessageAttachment
```

**HousingUnitType** defines the rules for a class of housing units: how long
calls can last, what hours calling is allowed, how many contacts a person
can have, and how many concurrent video calls are permitted.

**ApprovedContact** is the link between an incarcerated person and a family
member. Contacts must be approved by an admin before any communication can
happen. Contacts can also be marked as attorney relationships (which may
have different monitoring rules).

**BlockedNumber** can be scoped to a single facility or to an entire agency.
