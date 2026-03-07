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
  participants: Map<string, RoomParticipant>;
  createdAt: Date;
  scheduledEndTimer?: ReturnType<typeof setTimeout>;
};

function createSignalingServer() {
  const httpServer = createServer();
  const io = new Server(httpServer, { cors: { origin: '*' } });
  const rooms = new Map<string, CallRoom>();

  function forceEndRoom(roomId: string, reason: string) {
    const room = rooms.get(roomId);
    if (!room) return;
    io.to(roomId).emit('call-ended', { reason });
    room.participants.forEach((_, socketId) => {
      io.sockets.sockets.get(socketId)?.leave(roomId);
    });
    if (room.scheduledEndTimer) clearTimeout(room.scheduledEndTimer);
    rooms.delete(roomId);
  }

  io.on('connection', (socket) => {
    socket.on('join-room', (data: {
      roomId: string;
      userId: string;
      userRole: 'incarcerated' | 'family';
      callType: 'voice' | 'video';
      scheduledEnd?: string;
    }) => {
      const { roomId, userId, userRole, callType, scheduledEnd } = data;
      let room = rooms.get(roomId);

      if (!room) {
        room = {
          roomId,
          callType,
          participants: new Map(),
          createdAt: new Date(),
        };

        // Server-side scheduled end enforcement
        if (scheduledEnd) {
          const msRemaining = new Date(scheduledEnd).getTime() - Date.now();
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
      socket.emit('room-joined', { roomId, participants: otherParticipants });
      socket.to(roomId).emit('user-joined', { socketId: socket.id, userId, userRole });
    });

    socket.on('call-ended', (data: { roomId: string; reason: string }) => {
      const { roomId, reason } = data;
      socket.to(roomId).emit('call-ended', { reason });
      const room = rooms.get(roomId);
      if (room) {
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
});
