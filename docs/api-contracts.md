# API Contracts

This document defines the cross-team API contracts. These endpoints must be implemented exactly as specified so other teams can call them.

## Response Format

All endpoints return responses in this format:

```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## Admin Platform API (Other Guilds Consume)

### GET /api/admin/contacts/:incarceratedPersonId
Returns approved contacts for an incarcerated person.

**Used by**: Voice, Video, Messaging

### GET /api/admin/contacts/check
Query: `?incarceratedPersonId=X&familyMemberId=Y`

Returns: `{ approved: boolean, isAttorney: boolean }`

**Used by**: All communication guilds (before connecting)

### GET /api/admin/facility/:facilityId
Returns facility info including announcement text/audio.

**Used by**: Voice (for announcements)

### GET /api/admin/housing-unit-type/:unitTypeId
Returns rules for the unit type (call duration, hours, etc.).

**Used by**: Voice, Video

### GET /api/admin/user/:userId
Returns user profile (incarcerated or family).

### GET /api/admin/blocked-numbers/check
Query: `?phoneNumber=X&facilityId=Y`

Returns: `{ blocked: boolean, scope: 'facility' | 'agency' }`

**Used by**: Voice

---

## Voice Guild API

### GET /api/voice/active-calls
Query: `?facilityId=X`

Returns list of calls currently in progress.

### GET /api/voice/call-logs
Query: `?facilityId=X&startDate=Y&endDate=Z&userId=W&page=1&pageSize=20`

Returns paginated call history.

### POST /api/voice/terminate-call/:callId
Body: `{ adminId: string }`

Terminates an active call.

### GET /api/voice/stats
Query: `?facilityId=X&date=Y`

Returns: `{ activeCalls: number, todayTotal: number }`

---

## Video Guild API

### GET /api/video/active-calls
Query: `?facilityId=X`

Returns list of video calls in progress.

### GET /api/video/call-logs
Query: `?facilityId=X&startDate=Y&endDate=Z&userId=W&page=1&pageSize=20`

Returns paginated video call history.

### GET /api/video/pending-requests
Query: `?facilityId=X`

Returns video call requests awaiting approval.

### POST /api/video/approve-request/:callId
Body: `{ adminId: string }`

Approves a video call request.

### POST /api/video/terminate-call/:callId
Body: `{ adminId: string }`

Terminates an active video call.

### GET /api/video/stats
Query: `?facilityId=X&date=Y`

Returns: `{ activeCalls: number, todayTotal: number, pendingRequests: number }`

---

## Messaging Guild API

### POST /api/messaging/send
Body: `{ conversationId: string, body: string }`

Sends a message. Automatically screened against the facility's flagged keyword list — matches are held as `pending_review`, all others are set to `sent`. Returns: `{ message, flagged: boolean }`

**Used by**: Incarcerated and family member interfaces

### GET /api/messaging/logs
Query: `?facilityId=X&startDate=Y&endDate=Z&userId=W&page=1&pageSize=20`

Returns paginated message metadata.

### GET /api/messaging/pending
Query: `?facilityId=X`

Returns messages in `pending_review` status awaiting manual review.

### POST /api/messaging/approve/:messageId
Approves a pending message.

### POST /api/messaging/reject/:messageId
Rejects a pending message (sets status to `blocked`).

### POST /api/messaging/block-conversation/:conversationId
Blocks a conversation.

### POST /api/messaging/unblock-conversation/:conversationId
Removes a block from a conversation.

### GET /api/messaging/blocked-conversations
Query: `?facilityId=X`

Returns all blocked conversations for a facility.

### GET /api/messaging/contact-requests
Query: `?facilityId=X`

Returns pending contact requests for a facility.

### POST /api/messaging/contact-requests/:requestId/approve
Approves a contact request.

### POST /api/messaging/contact-requests/:requestId/deny
Denies a contact request.

### GET /api/messaging/keywords
Query: `?facilityId=X`

Returns the flagged keyword list for a facility.

### POST /api/messaging/keywords
Body: `{ phrase: string, facilityId?: string }`

Adds a keyword. Stored lowercase; unique per facility.

### PUT /api/messaging/keywords/:keywordId
Body: `{ phrase: string }`

Updates a keyword phrase.

### DELETE /api/messaging/keywords/:keywordId
Removes a keyword.

### GET /api/messaging/stats
Query: `?facilityId=X&date=Y`

Returns: `{ todayTotal: number, pendingReview: number }`

---

## Authentication

All endpoints (except public ones) require a valid JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Use the middleware from `@openconnect/shared`:

```typescript
import { requireAuth, requireRole } from '@openconnect/shared';

router.get('/endpoint', requireAuth, (req, res) => {
  // req.user contains the authenticated user
});

router.post('/admin-only', requireAuth, requireRole('facility_admin', 'agency_admin'), (req, res) => {
  // Only admins can access
});
```
