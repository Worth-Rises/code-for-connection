# Contributing to Code for Connection

This guide is for developers joining the project. It assumes you know basic programming concepts (variables, functions, loops, HTTP requests) but may be new to TypeScript, React, or this codebase.

## Local Setup

Follow the "Deploy from Scratch (Local Development)" procedure in `doc/RUNBOOK.md`. That document covers installing dependencies, configuring environment variables, running the database, and starting the development servers.

Once your local environment is running, come back here to learn how to add features.

## Adding a New API Endpoint

API endpoints live in each guild's `api/routes.ts` file. For example, the voice guild's routes are at `guilds/voice/api/routes.ts`.

Here is a complete example that adds a new endpoint returning a count of voice calls for a given facility:

```typescript
import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from '@openconnect/shared';

// Example: adding a GET endpoint that returns call statistics
voiceRouter.get('/my-new-endpoint', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await prisma.voiceCall.count({
      where: { facilityId: req.query.facilityId as string },
    });
    res.json(createSuccessResponse({ count: data }));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
    }));
  }
});
```

Here is what each piece does:

**Imports from `@openconnect/shared`** - The shared package provides utilities that every guild uses. You import them at the top of the file so they are available throughout.

**`requireAuth`** - This is middleware that checks the JWT token in the request header. A JWT token is a small piece of data the browser sends with every request to prove the user is logged in. If the token is missing or expired, the request is rejected with a 401 error before your code ever runs.

**`requireRole`** - This is middleware that checks the user's role (e.g., `'facility_admin'`, `'incarcerated'`, `'family'`). Use it when an endpoint should only be accessible to certain user types. You can pass one or more roles: `requireRole('facility_admin', 'agency_admin')`. It runs after `requireAuth`, so the user is guaranteed to be logged in.

**`prisma`** - This is the database client. Instead of writing raw SQL, you call methods like `prisma.voiceCall.count(...)`, `prisma.voiceCall.findMany(...)`, or `prisma.voiceCall.create(...)`. Prisma translates these calls into SQL for you. The available models (like `voiceCall`, `approvedContact`, `user`) are defined in `prisma/schema.prisma`.

**`createSuccessResponse`** - Wraps your data in a standard response format (`{ success: true, data: ... }`). Always use this for successful responses so the frontend can parse them consistently.

**`createErrorResponse`** - Wraps error details in a standard format (`{ success: false, error: { code, message } }`). Always use this for error responses.

**The try/catch block** - Every endpoint should catch errors and return a 500 response rather than crashing the server. Log the error with `console.error` so it appears in the server logs for debugging.

## Adding a New UI Screen

UI components live in each guild's `ui/` folder, organized by user role: `ui/admin/`, `ui/incarcerated/`, and `ui/family/`. Each role folder has an `index.tsx` file as its entry point.

Here is a complete example of a new screen component:

```typescript
import React, { useState, useEffect } from 'react';
import { Card, Button } from '@openconnect/ui';
import { useGuildApi } from '../../../shared/hooks/useGuildApi';

function MyNewScreen() {
  const api = useGuildApi('/api/voice');
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/my-new-endpoint?facilityId=123').then(res => {
      setData(res.data);
    });
  }, []);

  return (
    <Card padding="lg">
      <h2>My Screen</h2>
      {data ? <p>Count: {data.count}</p> : <p>Loading...</p>}
    </Card>
  );
}

export default MyNewScreen;
```

Here is what each piece does:

**`useGuildApi`** - A custom hook (from `guilds/shared/hooks/useGuildApi.ts`) that creates an HTTP client pre-configured with the user's authentication token. You pass it the base path for your guild's API (e.g., `'/api/voice'`), then call `api.get(...)`, `api.post(...)`, etc. The token is attached automatically, so you never have to manage authentication headers yourself.

**`useState`** - A React hook that creates a piece of state (a variable that, when changed, causes the screen to re-render). `useState(null)` starts with `null` as the initial value. `setData(...)` updates it. When `setData` is called, React re-draws the component with the new value.

**`useEffect`** - A React hook that runs code when the component first appears on screen. The empty array `[]` at the end means "run this once, when the component loads." This is where you fetch data from the API.

**`Card` and `Button`** - Shared UI components from `@openconnect/ui`. These provide consistent styling across the application. Use these instead of plain HTML elements like `<div>` for layout containers and interactive elements.

**The conditional render** - `{data ? <p>Count: {data.count}</p> : <p>Loading...</p>}` shows "Loading..." while the API request is in progress, then shows the data once it arrives. This is a common React pattern called conditional rendering.

### Adding the Route in App.tsx

After creating your component, you need to tell the web app how to navigate to it. Routes are defined in `apps/web/src/App.tsx`.

First, add a lazy import at the top of the file (with the other lazy imports):

```typescript
const MyNewScreen = lazy(() => import('../../../guilds/voice/ui/admin/MyNewScreen'));
```

`lazy()` means React will only load this component's code when the user navigates to it. This keeps the initial page load fast.

Then add a `<Route>` element inside the appropriate role section. For example, to add an admin-accessible screen:

```typescript
<Route path="my-new-screen" element={<MyNewScreen />} />
```

Place this inside the admin `<Route>` block (look for the `{/* Admin Routes */}` comment in `App.tsx`). The full URL will be `/admin/my-new-screen` because it is nested under the `/admin` parent route.

## The Guild Pattern

This project is organized into "guilds," each responsible for one communication feature. The current guilds are:

- **voice** (`guilds/voice/`) - Phone calls
- **video** (`guilds/video/`) - Video visits
- **messaging** (`guilds/messaging/`) - Text messaging
- **admin** (`guilds/admin/`) - Facility administration

### Why guilds?

Each guild team works independently. When the voice team adds a new endpoint, they edit files in `guilds/voice/` and nothing else. The messaging team can work at the same time in `guilds/messaging/` without merge conflicts. Ownership is clear: if something breaks in `guilds/video/`, the video team owns it.

### How guilds are structured

Each guild is a folder with two main parts:

- **`api/routes.ts`** - The backend. Defines Express routes that handle HTTP requests from the frontend.
- **`ui/`** - The frontend. Contains React components organized by user role (`admin/`, `incarcerated/`, `family/`).

### How guilds connect to the rest of the system

**The API gateway** (`services/api-gateway/src/index.ts`) mounts each guild's router at a URL path:

```typescript
app.use('/api/voice', voiceRouter);
app.use('/api/video', videoRouter);
app.use('/api/messaging', messagingRouter);
app.use('/api/admin', adminRouter);
```

This means a route defined as `/stats` in `guilds/voice/api/routes.ts` is accessible at `/api/voice/stats` from the frontend.

**The web app** (`apps/web/src/App.tsx`) lazy-loads each guild's UI components using React's `lazy()` function. Each guild's screens are nested under role-based routes (`/incarcerated/voice/*`, `/family/video/*`, `/admin/messaging/*`, etc.).

### What guilds share

Guilds share two things:

1. **The database**, via Prisma. All guilds use the same `prisma` client and the same schema (defined in `prisma/schema.prisma`).
2. **Authentication and utilities**, via `@openconnect/shared`. This includes `requireAuth`, `requireRole`, `createSuccessResponse`, `createErrorResponse`, and the `prisma` client itself.
3. **UI components**, via `@openconnect/ui`. Shared components like `Card`, `Button`, and `LoadingSpinner`.
4. **Hooks**, via `guilds/shared/hooks/`. Shared React hooks like `useGuildApi`, `useSocket`, and `useCallTimer`.

### What guilds do NOT share

Guilds do not import from each other. The voice guild never imports code from the messaging guild. If two guilds need the same utility, it belongs in `@openconnect/shared` or `guilds/shared/`.

## Code Conventions

**TypeScript for all code.** Both backend (Express routes) and frontend (React components) are written in TypeScript. TypeScript adds type annotations to JavaScript, catching errors before the code runs. If you see `req: Request` or `data: string`, those are type annotations.

**Tailwind CSS for styling.** Instead of writing CSS files, you apply utility classes directly in the HTML. For example, `className="text-lg font-bold text-blue-600"` makes text large, bold, and blue. The Tailwind documentation (https://tailwindcss.com/docs) is the reference for available classes.

**Prisma for database queries.** Never write raw SQL. Use the Prisma client methods (`findMany`, `create`, `update`, `count`, `delete`). The schema at `prisma/schema.prisma` defines what tables and columns exist.

**Express for API routes.** Each guild's backend is an Express router. Routes follow the pattern: HTTP method, path, middleware, handler function.

**React with hooks for UI.** All components are functions (not classes). State management uses hooks like `useState` and `useEffect`. If you see older React tutorials using `class MyComponent extends React.Component`, that style is not used here.

**File structure mirrors the guild.** If you are working on voice features, all your files go in `guilds/voice/`. API code goes in `guilds/voice/api/`, UI code goes in `guilds/voice/ui/`.

## Making a Pull Request

### Branch from the guild branch

Each guild has its own long-lived branch. Branch from the one that matches your work:

- `guild-voice` for voice features
- `guild-video` for video features
- `guild-messaging` for messaging features
- `guild-admin` for admin features

Create your feature branch from the guild branch:

```bash
git checkout guild-voice
git pull origin guild-voice
git checkout -b feat/voice-call-stats
```

### Commit messages

Start each commit message with a type prefix:

- `feat:` - A new feature (e.g., `feat: add call duration stats endpoint`)
- `fix:` - A bug fix (e.g., `fix: handle null facilityId in call logs`)
- `doc:` - Documentation changes (e.g., `doc: add voice API usage examples`)
- `deploy:` - Deployment or infrastructure changes (e.g., `deploy: add Redis to docker-compose`)

### PR description

Include a short summary and a test plan:

```
## Summary
- Added GET /api/voice/stats endpoint for call statistics
- Added admin dashboard widget showing daily call count

## Test plan
- [ ] Start local dev environment
- [ ] Log in as facility admin
- [ ] Navigate to admin dashboard and verify call count displays
- [ ] Check network tab to confirm /api/voice/stats returns expected data
```

### Code review

Request a review from at least one other member of your guild. If your change touches `@openconnect/shared` or `guilds/shared/`, request a review from someone outside your guild as well, since those changes affect everyone.
