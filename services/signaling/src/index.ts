import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

interface RoomParticipant {
  odSocketId: string;
  odUserId: string;
  odUserRole: 'incarcerated' | 'family';
  odJoinedAt: Date;
}

interface CallRoom {
  roomId: string;
  callType: 'voice' | 'video';
  phase: 'waiting' | 'active';
  participants: Map<string, RoomParticipant>;
  createdAt: Date;
  scheduledStart?: Date;
  scheduledStartTimer?: ReturnType<typeof setTimeout>;
  scheduledEnd?: Date;
  scheduledEndTimer?: ReturnType<typeof setTimeout>;
}

const rooms = new Map<string, CallRoom>();

function toPublicParticipants(room: CallRoom) {
  return Array.from(room.participants.entries()).map(([socketId, p]) => ({
    socketId,
    userId: p.odUserId,
    userRole: p.odUserRole,
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

  // Backward-compat bridge: synthesize user-joined once room becomes active so
  // existing clients can begin negotiation without changing API contracts yet.
  const participants = Array.from(room.participants.entries());
  for (const [socketId] of participants) {
    for (const [otherSocketId, other] of participants) {
      if (otherSocketId === socketId) continue;
      io.to(socketId).emit('user-joined', {
        socketId: otherSocketId,
        userId: other.odUserId,
        userRole: other.odUserRole,
      });
    }
  }

  console.log(`Room ${roomId} transitioned to active`);
}

function isRoomActiveForSocket(socket: Socket, roomId: string): boolean {
  const room = rooms.get(roomId);
  if (!room || room.phase !== 'active') {
    socket.emit('call-not-active', { roomId, phase: room?.phase ?? 'waiting' });
    return false;
  }

  if (!room.participants.has(socket.id)) {
    socket.emit('call-not-active', { roomId, phase: room.phase });
    return false;
  }

  return true;
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
  console.log(`Room ${roomId} force-ended: ${reason}`);
}

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

async function setupRedisAdapter() {
  try {
    const pubClient = new Redis(REDIS_URL);
    const subClient = pubClient.duplicate();
    
    await Promise.all([
      new Promise<void>((resolve) => pubClient.on('connect', resolve)),
      new Promise<void>((resolve) => subClient.on('connect', resolve)),
    ]);
    
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Redis adapter connected');
  } catch (error) {
    console.warn('Redis connection failed, running without adapter:', error);
  }
}

io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

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

      // Server-side scheduled-end enforcement — safety net if client timers fail
      if (parsedEnd) {
        const msRemaining = parsedEnd.getTime() - Date.now();
        if (msRemaining <= 0) {
          // Window already closed — reject immediately
          socket.emit('call-ended', { reason: 'time_limit' });
          return;
        }
        room.scheduledEndTimer = setTimeout(() => {
          forceEndRoom(roomId, 'time_limit');
        }, msRemaining);
        console.log(`Room ${roomId}: scheduled-end timer set for ${msRemaining}ms`);
      }

      rooms.set(roomId, room);
    } else {
      // Existing room schedule is authoritative for lifecycle after first join.
      if (scheduledStart || scheduledEnd) {
        const startMatches = !scheduledStart || room.scheduledStart?.toISOString() === scheduledStart;
        const endMatches = !scheduledEnd || room.scheduledEnd?.toISOString() === scheduledEnd;
        if (!startMatches || !endMatches) {
          console.warn(`Room ${roomId}: ignoring mismatched client schedule payload`);
        }
      }
    }

    room.participants.set(socket.id, {
      odSocketId: socket.id,
      odUserId: userId,
      odUserRole: userRole,
      odJoinedAt: new Date(),
    });

    socket.join(roomId);
    
    const otherParticipants = Array.from(room.participants.entries())
      .filter(([id]) => id !== socket.id)
      .map(([id, p]) => ({ socketId: id, userId: p.odUserId, userRole: p.odUserRole }));

    socket.emit('room-joined', {
      roomId,
      phase: room.phase,
      scheduledStart: room.scheduledStart?.toISOString(),
      scheduledEnd: room.scheduledEnd?.toISOString(),
      participants: otherParticipants,
    });

    if (room.phase === 'active') {
      socket.to(roomId).emit('user-joined', {
        socketId: socket.id,
        userId,
        userRole,
      });
    } else {
      socket.to(roomId).emit('waiting-user-joined', {
        socketId: socket.id,
        userId,
        userRole,
      });
    }

    if (room.phase === 'waiting' && room.scheduledStart && Date.now() >= room.scheduledStart.getTime()) {
      activateRoom(roomId);
    }

    console.log(`User ${userId} joined room ${roomId}`);
  });

  socket.on('offer', (data: { roomId: string; sdp: any }) => {
    if (!isRoomActiveForSocket(socket, data.roomId)) return;
    socket.to(data.roomId).emit('offer', {
      roomId: data.roomId,
      senderSocketId: socket.id,
      sdp: data.sdp,
    });
  });

  socket.on('answer', (data: { roomId: string; sdp: any }) => {
    if (!isRoomActiveForSocket(socket, data.roomId)) return;
    socket.to(data.roomId).emit('answer', {
      roomId: data.roomId,
      senderSocketId: socket.id,
      sdp: data.sdp,
    });
  });

  socket.on('ice-candidate', (data: { roomId: string; candidate: any }) => {
    if (!isRoomActiveForSocket(socket, data.roomId)) return;
    socket.to(data.roomId).emit('ice-candidate', {
      roomId: data.roomId,
      senderSocketId: socket.id,
      candidate: data.candidate,
    });
  });

  socket.on('leave-room', (data: { roomId: string }) => {
    const { roomId } = data;
    handleLeaveRoom(socket, roomId);
  });

  socket.on('call-ended', (data: {
    roomId: string;
    reason: 'user' | 'time_limit' | 'admin';
  }) => {
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
    
    console.log(`Call ended in room ${roomId}, reason: ${reason}`);
  });

  socket.on('mute-toggle', (data: {
    roomId: string;
    type: 'audio' | 'video';
    muted: boolean;
  }) => {
    const { roomId, type, muted } = data;
    socket.to(roomId).emit('peer-mute-toggle', {
      socketId: socket.id,
      type,
      muted,
    });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    rooms.forEach((room, roomId) => {
      if (room.participants.has(socket.id)) {
        handleLeaveRoom(socket, roomId);
      }
    });
  });
});

function handleLeaveRoom(socket: Socket, roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const participant = room.participants.get(socket.id);
  if (participant) {
    room.participants.delete(socket.id);
    socket.leave(roomId);
    
    socket.to(roomId).emit('user-left', {
      socketId: socket.id,
      userId: participant.odUserId,
    });

    console.log(`User ${participant.odUserId} left room ${roomId}`);

    if (room.participants.size === 0) {
      if (room.scheduledStartTimer) clearTimeout(room.scheduledStartTimer);
      if (room.scheduledEndTimer) clearTimeout(room.scheduledEndTimer);
      rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
    }
  }
}

async function start() {
  await setupRedisAdapter();
  
  httpServer.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
  });
}

start().catch(console.error);
