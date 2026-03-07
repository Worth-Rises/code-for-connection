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
  participants: Map<string, RoomParticipant>;
  createdAt: Date;
  scheduledEndTimer?: ReturnType<typeof setTimeout>;
}

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

      // Server-side scheduled-end enforcement — safety net if client timers fail
      if (scheduledEnd) {
        const msRemaining = new Date(scheduledEnd).getTime() - Date.now();
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
      participants: otherParticipants,
    });

    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      userId,
      userRole,
    });

    console.log(`User ${userId} joined room ${roomId}`);
  });

  socket.on('offer', (data: { roomId: string; sdp: any }) => {
    socket.to(data.roomId).emit('offer', {
      roomId: data.roomId,
      senderSocketId: socket.id,
      sdp: data.sdp,
    });
  });

  socket.on('answer', (data: { roomId: string; sdp: any }) => {
    socket.to(data.roomId).emit('answer', {
      roomId: data.roomId,
      senderSocketId: socket.id,
      sdp: data.sdp,
    });
  });

  socket.on('ice-candidate', (data: { roomId: string; candidate: any }) => {
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
