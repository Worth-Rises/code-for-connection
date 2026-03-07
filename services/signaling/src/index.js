"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const ioredis_1 = require("ioredis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const rooms = new Map();
const httpServer = (0, http_1.createServer)();
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
});
async function setupRedisAdapter() {
    try {
        const pubClient = new ioredis_1.Redis(REDIS_URL);
        const subClient = pubClient.duplicate();
        await Promise.all([
            new Promise((resolve) => pubClient.on('connect', resolve)),
            new Promise((resolve) => subClient.on('connect', resolve)),
        ]);
        io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
        console.log('Redis adapter connected');
    }
    catch (error) {
        console.warn('Redis connection failed, running without adapter:', error);
    }
}
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.on('join-room', (data) => {
        const { roomId, userId, userRole, callType } = data;
        let room = rooms.get(roomId);
        if (!room) {
            room = {
                roomId,
                callType,
                participants: new Map(),
                createdAt: new Date(),
            };
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
    socket.on('offer', (data) => {
        const { roomId, targetSocketId, sdp } = data;
        io.to(targetSocketId).emit('offer', {
            roomId,
            senderSocketId: socket.id,
            sdp,
        });
    });
    socket.on('answer', (data) => {
        const { roomId, targetSocketId, sdp } = data;
        io.to(targetSocketId).emit('answer', {
            roomId,
            senderSocketId: socket.id,
            sdp,
        });
    });
    socket.on('ice-candidate', (data) => {
        const { roomId, targetSocketId, candidate } = data;
        io.to(targetSocketId).emit('ice-candidate', {
            roomId,
            senderSocketId: socket.id,
            candidate,
        });
    });
    socket.on('leave-room', (data) => {
        const { roomId } = data;
        handleLeaveRoom(socket, roomId);
    });
    socket.on('call-ended', (data) => {
        const { roomId, reason } = data;
        socket.to(roomId).emit('call-ended', { reason });
        const room = rooms.get(roomId);
        if (room) {
            room.participants.forEach((_, socketId) => {
                io.sockets.sockets.get(socketId)?.leave(roomId);
            });
            rooms.delete(roomId);
        }
        console.log(`Call ended in room ${roomId}, reason: ${reason}`);
    });
    socket.on('mute-toggle', (data) => {
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
function handleLeaveRoom(socket, roomId) {
    const room = rooms.get(roomId);
    if (!room)
        return;
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
//# sourceMappingURL=index.js.map