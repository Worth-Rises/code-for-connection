# Guild Guides

## Voice Guild

### Your Directory
`guilds/voice/`
- `api/routes.ts` - Express routes for `/api/voice/*`
- `ui/incarcerated/` - Tablet UI for making calls
- `ui/family/` - Family app UI for receiving calls
- `ui/admin/` - Admin dashboard for call monitoring

### Required Features
- [ ] PIN authentication integration
- [ ] View approved contacts
- [ ] Initiate outbound call
- [ ] Call timer display
- [ ] 1-minute warning audio
- [ ] Auto-disconnect at time limit
- [ ] End call manually
- [ ] Call history
- [ ] Legal call option (attorney)
- [ ] Facility announcement playback
- [ ] Accept/decline call prompt (family)
- [ ] Admin: View active calls
- [ ] Admin: Terminate call

### Key Dependencies
- WebRTC via simple-peer or peerjs
- Twilio for PSTN bridge
- Socket.io client for signaling

---

## Video Guild

### Your Directory
`guilds/video/`
- `api/routes.ts` - Express routes for `/api/video/*`
- `ui/incarcerated/` - Tablet UI for video calls
- `ui/family/` - Family app UI for scheduling/joining
- `ui/admin/` - Admin dashboard for approval/monitoring

### Required Features
- [ ] View scheduled video calls
- [ ] Join scheduled video call
- [ ] Camera/mic controls
- [ ] Call timer with warnings
- [ ] Auto-disconnect at time limit
- [ ] Family: Request video call
- [ ] Family: View scheduled video calls
- [ ] Admin: Approve/deny requests
- [ ] Admin: View active calls
- [ ] Admin: Terminate call

### Optional Features
- [ ] Background blur (TensorFlow.js)
- [ ] Multiple participants

---

## Messaging Guild

### Your Directory
`guilds/messaging/`
- `api/routes.ts` - Express routes for `/api/messaging/*`
- `ui/incarcerated/` - Tablet messaging interface
- `ui/family/` - Family app messaging interface
- `ui/admin/` - Admin message review dashboard

### Required Features
- [ ] View conversations
- [ ] Send text messages
- [ ] Receive messages (real-time)
- [ ] Message status indicators
- [ ] Admin: View pending messages
- [ ] Admin: Approve/block messages
- [ ] Admin: Block conversations

### Optional Features
- [ ] Photo attachments
- [ ] Read receipts
- [ ] Typing indicators

---

## Admin Platform Guild

### Your Directory
`guilds/admin/`
- `api/routes.ts` - Express routes for `/api/admin/*`
- `ui/` - Admin dashboard components

### Required Features
- [ ] Contact management (approve/deny/remove)
- [ ] User profiles view
- [ ] Facility configuration
- [ ] Blocked numbers management
- [ ] Dashboard with stats from all guilds

### Key Endpoints You Provide
- `GET /api/admin/contacts/:incarceratedPersonId`
- `GET /api/admin/contacts/check`
- `GET /api/admin/facility/:facilityId`
- `GET /api/admin/housing-unit-type/:unitTypeId`
- `GET /api/admin/user/:userId`
- `GET /api/admin/blocked-numbers/check`

---

## Common Tasks

### Using Authentication
```typescript
import { requireAuth, requireRole } from '@openconnect/shared';

// Any authenticated user
router.get('/my-data', requireAuth, (req, res) => {
  const user = req.user; // { id, role, facilityId, ... }
});

// Admin only
router.post('/admin-action', requireAuth, requireRole('facility_admin', 'agency_admin'), (req, res) => {
  // ...
});
```

### Database Queries
```typescript
import { prisma } from '@openconnect/shared';

const calls = await prisma.voiceCall.findMany({
  where: { facilityId },
  include: {
    incarceratedPerson: true,
    familyMember: true,
  },
});
```

### WebRTC Signaling
```typescript
import { io } from 'socket.io-client';

const socket = io(SIGNALING_URL);

socket.emit('join-room', {
  roomId: callId,
  userId: user.id,
  userRole: 'incarcerated',
  callType: 'voice',
});

socket.on('user-joined', ({ socketId, userId }) => {
  // Create peer connection
});
```
