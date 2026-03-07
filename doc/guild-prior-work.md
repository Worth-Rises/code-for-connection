# Guild Prior Work: What Each Team Has Built

A summary of the work done by each guild team, based on their GitHub forks, branches, and Slack channels. This is meant to help coordinate contributions and avoid duplicating effort.

## Voice Guild

**Fork**: https://github.com/boubascript/code-for-connection
**Team members**: Boubacar (boubascript), Janak Ramakrishnan (janakdr), Dolan Dworak, Max Bessler, Al Barrentine, Andre Sobers
**Active branches**: `guild-voice`, `gv-janak1` (Twilio integration), `dolan/docs` (spec doc)

### What they've built

**Janak's Twilio integration** (`gv-janak1`, PR #1 on Boubacar's fork): A working voice call backend that places real phone calls through Twilio. This is substantial, well-structured work:

- `POST /initiate-call` creates a VoiceCall record, verifies the contact is approved, checks the number against the blocked list, then places an actual Twilio outbound call to the family member's phone
- `POST /end-call/:callId` hangs up the Twilio call and records duration
- Uses an in-memory `twilioSidMap` to track Twilio call SIDs (pragmatic hackathon workaround since the Prisma schema doesn't have a Twilio SID column)
- The Twilio call plays a TwiML greeting: "You have an incoming call from [name]. Press any key to accept."
- Graceful error handling: if Twilio fails, the DB record is updated to `missed` and a useful error is returned

**Janak's incarcerated UI** (510 lines): A full working tablet interface with:
- Contact list with phone number display and call buttons
- Active call screen with timer, mute toggle, and end call button
- Call history view with relative timestamps
- Custom auth header helper and phone number formatter
- Uses `localStorage.getItem('token')` directly rather than the shared `useGuildApi` hook (reasonable choice since the shared hooks didn't exist on their branch)

**Dolan's voice spec** (`dolan/docs`): A detailed feature specification covering all three interfaces (incarcerated, family, admin), including legal call flagging, facility disclaimer audio, three-way call detection, PREA/crisis hotline speed dials, and demo scenario. This is thorough product thinking.

**Al Barrentine**: Provided Twilio credentials (Account SID, Auth Token) and a demo phone number (+18777485961).

### How their work relates to ours

Our `admin-voice-chris` branch has the same admin endpoints (active-calls, call-logs, terminate-call, stats) and adds `my-contacts`, `initiate-call`, and `my-calls`. The key difference: our `initiate-call` creates a DB record and returns a Socket.IO room ID for browser-based signaling, while Janak's places an actual Twilio phone call. These are complementary approaches. Janak's handles the real telephony path (incarcerated tablet to family member's phone); ours handles the browser signaling path.

The admin endpoints are identical in structure and compatible in response format.

---

## Video Guild

**Upstream branch**: `origin/guild-video` (Worth-Rises/code-for-connection)
**Spec doc**: `GUILD_VIDEO_SPEC.md` (merged via PR #1 by yungalgo, approved by Courtney)
**Team**: yungalgo, plus others in #guild-video

### What they've built

**Spec document** (merged upstream): A comprehensive feature spec covering:
- All three interfaces (incarcerated, family, admin)
- Scheduling workflow: family requests time slot, admin approves, both parties join at scheduled time
- WebRTC video with camera/mic toggles and background blur
- Legal video call support (prohibits monitoring)
- Optional scope: ambient noise cancelling, voice captioning, real-time translation, quality metrics

**Terminology note**: The spec explicitly says to use "video calls" not "video visits." They consider "video visit" to be industry language created to justify eliminating in-person visits. Our code uses "video visits" in the family UI placeholder text; this should be updated.

**No implementation code yet** on the upstream `guild-video` branch beyond the base starter commits and the spec doc.

### How their work relates to ours

Our `admin-video-chris` branch has a full backend (active-calls, call-logs, pending-requests, approve/deny, terminate, stats, request-visit, my-scheduled, join-call) and placeholder frontend stubs. The backend aligns well with the spec's requirements. Their spec adds details we haven't implemented: background blur, legal call flagging for video, automated scheduling based on time slots.

---

## Messaging Guild

**Fork**: https://github.com/benjaminmeow/code-for-connection-messaging (separate repo, not a fork of the original)
**Branch**: `guild-message`
**Team members**: Ben Zhou (benjaminmeow), Amber Abreu, Brian Sahota, Adam Thomas, Luna Chen, Davon B

### What they've built

**Backend routes** (179 new lines in `routes.ts`): A complete messaging API that goes beyond our implementation:

- `POST /conversations` (upsert): Creates or retrieves a conversation between an incarcerated person and family member. Uses Prisma's `upsert` with the unique constraint on `[incarceratedPersonId, familyMemberId]`. This is something we don't have; our version only has `GET /conversations`.
- `GET /conversations`: Lists conversations for the authenticated user. Their version uses a cleaner role-based `where` clause (`user.role === 'incarcerated'` check) instead of our `OR` query, and doesn't filter out blocked conversations (different design choice).
- `GET /conversations/:conversationId/messages`: Paginated messages, ordered ascending (oldest first). Same as ours but uses `conversationId` as the param name instead of `id`.
- `POST /send`: Sends a message. This is more thorough than our version: verifies the conversation exists, checks if it's blocked, confirms the user is a participant, and validates required fields. Our `/conversations/:id/send` skips these checks.

**Incarcerated UI** (163 new lines): A working chat interface with:
- Conversation list showing contact name and last message preview
- Chat thread with messages, input bar, and send button
- Navigation between conversation list and thread views
- Uses `apiFetch` helper with `localStorage.getItem('token')`

**Family UI** (204 new lines): Same chat interface plus:
- "New Message" button to start a conversation by entering an incarcerated person's ID
- Uses `POST /conversations` upsert to create/retrieve the conversation
- Fetches current user ID via `/auth/me` for the conversation creation

### How their work relates to ours

Both implementations share the same admin endpoints (logs, pending, approve, block-conversation, stats) identically. The differences are in the user-facing routes:

| Feature | Our version | Their version |
|---------|-------------|---------------|
| Create conversation | Not supported | `POST /conversations` with upsert |
| Send message | `POST /conversations/:id/send` (no validation) | `POST /send` (validates participant, checks blocked) |
| Get messages | Param name `:id` | Param name `:conversationId` |
| List conversations | Filters out blocked | Doesn't filter blocked |
| Frontend | Stubs | Working chat UI |

Their send endpoint has better validation. Their conversation creation via upsert is a feature we're missing.

---

## What this means for integration

Each guild team has made real, thoughtful progress. The approaches are complementary rather than conflicting:

1. **Voice**: Janak's Twilio integration handles the real telephony path that our Socket.IO approach doesn't cover. Both use the same Prisma models and admin endpoints. A combined version would use Twilio for the actual phone call and Socket.IO for tablet UI state updates.

2. **Video**: The upstream spec doc is the authoritative source. Our backend implementation aligns with the spec. The terminology correction ("video calls" not "video visits") should be applied to our code.

3. **Messaging**: Ben's team has a more complete and more carefully validated API. Their `POST /conversations` upsert and their validated `/send` endpoint are improvements over our versions. Their working chat UIs demonstrate the full user flow.

All three guild teams use the same Prisma schema, the same auth system, and the same response format conventions. No schema conflicts or API contract disagreements exist.
