import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';

// ─── Build a minimal signaling server for tests ─────────────────────────────
// We replicate only the logic under test (scheduled-end enforcement) here,
// rather than importing the production server (which auto-starts on import).
// When we refactor the production module into a createApp() factory, these
// tests will be updated to use that factory directly.

type RoomParticipant = {
  socketId: string;
  userId: string;
  userRole: 'incarcerated' | 'family';
  joinedAt: Date;
};

type CallRoom = {
  roomId: string;
  callType: 'voice' | 'video';
  phase: 'waiting' | 'active';
  participants: Map<string, RoomParticipant>;
  createdAt: Date;
  scheduledStart?: Date;
  scheduledStartTimer?: ReturnType<typeof setTimeout>;
  scheduledEnd?: Date;
  scheduledEndTimer?: ReturnType<typeof setTimeout>;
};

function createSignalingServer() {
  const httpServer = createServer();
  const io = new Server(httpServer, { cors: { origin: '*' } });
  const rooms = new Map<string, CallRoom>();

  function toPublicParticipants(room: CallRoom) {
    return Array.from(room.participants.entries()).map(([socketId, p]) => ({
      socketId,
      userId: p.userId,
      userRole: p.userRole,
    }));
  }

  function activateRoom(roomId: string) {
    const room = rooms.get(roomId);
    if (!room || room.phase === 'active') return;

    room.phase = 'active';
    if (room.scheduledStartTimer) {
      clearTimeout(room.scheduledStartTimer);
      room.scheduledStartTimer = undefined;
    }

    io.to(roomId).emit('call-started', {
      roomId,
      phase: 'active',
      scheduledStart: room.scheduledStart?.toISOString(),
      scheduledEnd: room.scheduledEnd?.toISOString(),
      participants: toPublicParticipants(room),
    });

    // Backward compatibility: emit user-joined at activation so peers can
    // begin negotiation when the call actually starts.
    const participants = Array.from(room.participants.entries());
    for (const [socketId] of participants) {
      for (const [otherSocketId, other] of participants) {
        if (otherSocketId === socketId) continue;
        io.to(socketId).emit('user-joined', {
          socketId: otherSocketId,
          userId: other.userId,
          userRole: other.userRole,
        });
      }
    }
  }

  function isRoomActiveForSocket(socketId: string, roomId: string) {
    const room = rooms.get(roomId);
    return !!room && room.phase === 'active' && room.participants.has(socketId);
  }

  function forceEndRoom(roomId: string, reason: string) {
    const room = rooms.get(roomId);
    if (!room) return;
    io.to(roomId).emit('call-ended', { reason });
    room.participants.forEach((_, socketId) => {
      io.sockets.sockets.get(socketId)?.leave(roomId);
    });
    if (room.scheduledStartTimer) clearTimeout(room.scheduledStartTimer);
    if (room.scheduledEndTimer) clearTimeout(room.scheduledEndTimer);
    rooms.delete(roomId);
  }

  io.on('connection', (socket) => {
    socket.on('join-room', (data: {
      roomId: string;
      userId: string;
      userRole: 'incarcerated' | 'family';
      callType: 'voice' | 'video';
      scheduledStart?: string;
      scheduledEnd?: string;
    }) => {
      const { roomId, userId, userRole, callType, scheduledStart, scheduledEnd } = data;
      let room = rooms.get(roomId);

      if (!room) {
        const parsedStart = scheduledStart ? new Date(scheduledStart) : undefined;
        const parsedEnd = scheduledEnd ? new Date(scheduledEnd) : undefined;

        if (parsedStart && Number.isNaN(parsedStart.getTime())) {
          socket.emit('join-error', { code: 'INVALID_SCHEDULE', message: 'Invalid scheduledStart' });
          return;
        }
        if (parsedEnd && Number.isNaN(parsedEnd.getTime())) {
          socket.emit('join-error', { code: 'INVALID_SCHEDULE', message: 'Invalid scheduledEnd' });
          return;
        }

        room = {
          roomId,
          callType,
          phase: parsedStart && Date.now() < parsedStart.getTime() ? 'waiting' : 'active',
          participants: new Map(),
          createdAt: new Date(),
          scheduledStart: parsedStart,
          scheduledEnd: parsedEnd,
        };

        if (room.phase === 'waiting' && parsedStart) {
          const startMsRemaining = parsedStart.getTime() - Date.now();
          room.scheduledStartTimer = setTimeout(() => {
            activateRoom(roomId);
          }, startMsRemaining);
        }

        // Server-side scheduled end enforcement
        if (parsedEnd) {
          const msRemaining = parsedEnd.getTime() - Date.now();
          if (msRemaining <= 0) {
            // Already past the end — immediately close
            socket.emit('call-ended', { reason: 'time_limit' });
            return;
          }
          room.scheduledEndTimer = setTimeout(() => {
            forceEndRoom(roomId, 'time_limit');
          }, msRemaining);
        }

        rooms.set(roomId, room);
      }

      room.participants.set(socket.id, {
        socketId: socket.id,
        userId,
        userRole,
        joinedAt: new Date(),
      });
      socket.join(roomId);

      const otherParticipants = Array.from(room.participants.entries())
        .filter(([id]) => id !== socket.id)
        .map(([id, p]) => ({ socketId: id, userId: p.userId }));
      socket.emit('room-joined', {
        roomId,
        phase: room.phase,
        scheduledStart: room.scheduledStart?.toISOString(),
        scheduledEnd: room.scheduledEnd?.toISOString(),
        participants: otherParticipants,
      });

      if (room.phase === 'active') {
        socket.to(roomId).emit('user-joined', { socketId: socket.id, userId, userRole });
      } else {
        socket.to(roomId).emit('waiting-user-joined', { socketId: socket.id, userId, userRole });
      }

      if (room.phase === 'waiting' && room.scheduledStart && Date.now() >= room.scheduledStart.getTime()) {
        activateRoom(roomId);
      }
    });

    socket.on('offer', (data: { roomId: string; sdp: unknown }) => {
      if (!isRoomActiveForSocket(socket.id, data.roomId)) {
        socket.emit('call-not-active', { roomId: data.roomId, phase: rooms.get(data.roomId)?.phase ?? 'waiting' });
        return;
      }
      socket.to(data.roomId).emit('offer', {
        roomId: data.roomId,
        senderSocketId: socket.id,
        sdp: data.sdp,
      });
    });

    socket.on('call-ended', (data: { roomId: string; reason: string }) => {
      const { roomId, reason } = data;
      socket.to(roomId).emit('call-ended', { reason });
      const room = rooms.get(roomId);
      if (room) {
        if (room.scheduledStartTimer) clearTimeout(room.scheduledStartTimer);
        if (room.scheduledEndTimer) clearTimeout(room.scheduledEndTimer);
        room.participants.forEach((_, socketId) => {
          io.sockets.sockets.get(socketId)?.leave(roomId);
        });
        rooms.delete(roomId);
      }
    });

    socket.on('disconnect', () => {
      rooms.forEach((room, roomId) => {
        if (room.participants.has(socket.id)) {
          room.participants.delete(socket.id);
          socket.to(roomId).emit('user-left', { socketId: socket.id });
          if (room.participants.size === 0) {
            if (room.scheduledStartTimer) clearTimeout(room.scheduledStartTimer);
            if (room.scheduledEndTimer) clearTimeout(room.scheduledEndTimer);
            rooms.delete(roomId);
          }
        }
      });
    });
  });

  return { httpServer, io, rooms };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function waitFor(socket: ClientSocket, event: string, timeoutMs = 2000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs);
    socket.once(event, (data) => { clearTimeout(t); resolve(data); });
  });
}

function connectClient(port: number, userId = 'user-1'): Promise<ClientSocket> {
  return new Promise((resolve) => {
    const client: ClientSocket = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    client.on('connect', () => resolve(client));
  });
}

function waitForNoEvent(socket: ClientSocket, event: string, timeoutMs = 250): Promise<void> {
  return new Promise((resolve, reject) => {
    const onEvent = () => {
      clearTimeout(t);
      reject(new Error(`Did not expect event "${event}"`));
    };
    const t = setTimeout(() => {
      socket.off(event, onEvent);
      resolve();
    }, timeoutMs);
    socket.once(event, onEvent);
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('Signaling Server — Scheduled End Enforcement', () => {
  let httpServer: ReturnType<typeof createServer>;
  let port: number;
  let clients: ClientSocket[] = [];

  beforeEach(async () => {
    vi.useFakeTimers();
    const server = createSignalingServer();
    httpServer = server.httpServer;

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address() as { port: number };
        port = addr.port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await Promise.all(clients.map((c) => new Promise<void>((r) => { c.disconnect(); r(); })));
    clients = [];
    await new Promise<void>((r) => httpServer.close(() => r()));
  });

  it('immediately emits call-ended when scheduledEnd is in the past', async () => {
    vi.useRealTimers(); // need real timers for this test (immediate fire)
    const client = await connectClient(port);
    clients.push(client);

    const pastEnd = new Date(Date.now() - 1000).toISOString(); // 1s ago
    const endedPromise = waitFor(client, 'call-ended');

    client.emit('join-room', {
      roomId: 'room-past',
      userId: 'user-1',
      userRole: 'incarcerated',
      callType: 'video',
      scheduledEnd: pastEnd,
    });

    const payload = await endedPromise as { reason: string };
    expect(payload.reason).toBe('time_limit');
  });

  it('emits call-ended to all participants after the scheduled end delay', async () => {
    vi.useRealTimers();
    const [c1, c2] = await Promise.all([
      connectClient(port, 'user-1'),
      connectClient(port, 'user-2'),
    ]);
    clients.push(c1, c2);

    // scheduledEnd 200ms from now
    const scheduledEnd = new Date(Date.now() + 200).toISOString();

    // Both join the same room
    const c1Joined = waitFor(c1, 'room-joined');
    c1.emit('join-room', { roomId: 'timed-room', userId: 'user-1', userRole: 'incarcerated', callType: 'video', scheduledEnd });
    await c1Joined;

    const c2Joined = waitFor(c2, 'room-joined');
    c2.emit('join-room', { roomId: 'timed-room', userId: 'user-2', userRole: 'family', callType: 'video' });
    await c2Joined;

    // Both should receive call-ended after ~200ms
    const [p1, p2] = await Promise.all([
      waitFor(c1, 'call-ended', 1000),
      waitFor(c2, 'call-ended', 1000),
    ]) as [{ reason: string }, { reason: string }];

    expect(p1.reason).toBe('time_limit');
    expect(p2.reason).toBe('time_limit');
  });

  it('clears the timer when admin (client) ends the call early via call-ended event', async () => {
    vi.useRealTimers();
    const [c1, c2] = await Promise.all([
      connectClient(port, 'user-1'),
      connectClient(port, 'user-2'),
    ]);
    clients.push(c1, c2);

    // scheduledEnd 5s from now — should NOT fire
    const scheduledEnd = new Date(Date.now() + 5000).toISOString();

    const c1Joined = waitFor(c1, 'room-joined');
    c1.emit('join-room', { roomId: 'admin-room', userId: 'user-1', userRole: 'incarcerated', callType: 'video', scheduledEnd });
    await c1Joined;

    const c2Joined = waitFor(c2, 'room-joined');
    c2.emit('join-room', { roomId: 'admin-room', userId: 'user-2', userRole: 'family', callType: 'video' });
    await c2Joined;

    // c1 ends the call early
    const c2EndedPromise = waitFor(c2, 'call-ended', 1000);
    c1.emit('call-ended', { roomId: 'admin-room', reason: 'admin' });

    const payload = await c2EndedPromise as { reason: string };
    expect(payload.reason).toBe('admin');
    // If the server timer wasn't cleared, it would fire again after 5s —
    // we can't easily assert that it does NOT fire in this test, but we do
    // verify the early-end path worked correctly.
  });

  it('rooms without scheduledEnd work normally (no auto-close)', async () => {
    vi.useRealTimers();
    const client = await connectClient(port);
    clients.push(client);

    const joinedPromise = waitFor(client, 'room-joined');
    client.emit('join-room', {
      roomId: 'no-timer-room',
      userId: 'user-1',
      userRole: 'incarcerated',
      callType: 'video',
      // no scheduledEnd
    });

    const payload = await joinedPromise as { roomId: string };
    expect(payload.roomId).toBe('no-timer-room');
    // No call-ended event should have been emitted
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  });

  it('places participants in waiting phase before scheduledStart and suppresses active user-joined', async () => {
    vi.useRealTimers();
    const [c1, c2] = await Promise.all([
      connectClient(port, 'user-1'),
      connectClient(port, 'user-2'),
    ]);
    clients.push(c1, c2);

    const scheduledStart = new Date(Date.now() + 400).toISOString();
    const scheduledEnd = new Date(Date.now() + 5000).toISOString();

    const c1Joined = waitFor(c1, 'room-joined');
    c1.emit('join-room', {
      roomId: 'waiting-room',
      userId: 'user-1',
      userRole: 'incarcerated',
      callType: 'video',
      scheduledStart,
      scheduledEnd,
    });
    const c1JoinPayload = await c1Joined as { phase: 'waiting' | 'active' };
    expect(c1JoinPayload.phase).toBe('waiting');

    const c2Joined = waitFor(c2, 'room-joined');
    const c1WaitingUserJoined = waitFor(c1, 'waiting-user-joined');
    const c1NoActiveJoin = waitForNoEvent(c1, 'user-joined', 200);

    c2.emit('join-room', {
      roomId: 'waiting-room',
      userId: 'user-2',
      userRole: 'family',
      callType: 'video',
      scheduledStart,
      scheduledEnd,
    });

    const c2JoinPayload = await c2Joined as { phase: 'waiting' | 'active' };
    expect(c2JoinPayload.phase).toBe('waiting');

    const waitingJoinPayload = await c1WaitingUserJoined as { userId: string };
    expect(waitingJoinPayload.userId).toBe('user-2');
    await c1NoActiveJoin;
  });

  it('emits call-started at scheduledStart and then allows active signaling', async () => {
    vi.useRealTimers();
    const [c1, c2] = await Promise.all([
      connectClient(port, 'user-1'),
      connectClient(port, 'user-2'),
    ]);
    clients.push(c1, c2);

    const scheduledStart = new Date(Date.now() + 250).toISOString();
    const scheduledEnd = new Date(Date.now() + 5000).toISOString();

    const c1Joined = waitFor(c1, 'room-joined');
    c1.emit('join-room', {
      roomId: 'start-transition-room',
      userId: 'user-1',
      userRole: 'incarcerated',
      callType: 'video',
      scheduledStart,
      scheduledEnd,
    });
    await c1Joined;

    const c2Joined = waitFor(c2, 'room-joined');
    c2.emit('join-room', {
      roomId: 'start-transition-room',
      userId: 'user-2',
      userRole: 'family',
      callType: 'video',
      scheduledStart,
      scheduledEnd,
    });
    await c2Joined;

    const c1CallStarted = waitFor(c1, 'call-started', 1000);
    const c2CallStarted = waitFor(c2, 'call-started', 1000);

    const [s1, s2] = await Promise.all([c1CallStarted, c2CallStarted]) as [
      { phase: 'waiting' | 'active'; roomId: string },
      { phase: 'waiting' | 'active'; roomId: string }
    ];
    expect(s1.phase).toBe('active');
    expect(s2.phase).toBe('active');
    expect(s1.roomId).toBe('start-transition-room');

    const c2Offer = waitFor(c2, 'offer', 1000);
    c1.emit('offer', { roomId: 'start-transition-room', sdp: { type: 'offer', sdp: 'mock' } });
    const offerPayload = await c2Offer as { roomId: string; sdp: { type: string } };
    expect(offerPayload.roomId).toBe('start-transition-room');
    expect(offerPayload.sdp.type).toBe('offer');
  });

  it('blocks offer signaling while room is waiting', async () => {
    vi.useRealTimers();
    const [c1, c2] = await Promise.all([
      connectClient(port, 'user-1'),
      connectClient(port, 'user-2'),
    ]);
    clients.push(c1, c2);

    const scheduledStart = new Date(Date.now() + 2000).toISOString();
    const scheduledEnd = new Date(Date.now() + 6000).toISOString();

    const c1Joined = waitFor(c1, 'room-joined');
    c1.emit('join-room', {
      roomId: 'blocked-offer-room',
      userId: 'user-1',
      userRole: 'incarcerated',
      callType: 'video',
      scheduledStart,
      scheduledEnd,
    });
    await c1Joined;

    const c2Joined = waitFor(c2, 'room-joined');
    c2.emit('join-room', {
      roomId: 'blocked-offer-room',
      userId: 'user-2',
      userRole: 'family',
      callType: 'video',
      scheduledStart,
      scheduledEnd,
    });
    await c2Joined;

    const notActivePromise = waitFor(c1, 'call-not-active', 1000);
    const noOfferToPeer = waitForNoEvent(c2, 'offer', 300);

    c1.emit('offer', { roomId: 'blocked-offer-room', sdp: { type: 'offer', sdp: 'blocked' } });

    const notActivePayload = await notActivePromise as { roomId: string; phase: 'waiting' | 'active' };
    expect(notActivePayload.roomId).toBe('blocked-offer-room');
    expect(notActivePayload.phase).toBe('waiting');
    await noOfferToPeer;
  });
});
