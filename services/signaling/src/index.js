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
        notifyAdminsOfRoomChange();
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
        notifyAdminsOfRoomChange();
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
// ==========================================
// ADMIN NAMESPACE — Live Call Management
// ==========================================
const adminNamespace = io.of('/admin');
adminNamespace.on('connection', (socket) => {
    console.log(`Admin connected: ${socket.id}`);
    // Admin requests list of active rooms
    socket.on('get-active-rooms', () => {
        const activeRooms = Array.from(rooms.entries()).map(([roomId, room]) => ({
            roomId,
            callType: room.callType,
            participantCount: room.participants.size,
            participants: Array.from(room.participants.values()).map(p => ({
                userId: p.odUserId,
                userRole: p.odUserRole,
                joinedAt: p.odJoinedAt,
            })),
            createdAt: room.createdAt,
        }));
        socket.emit('active-rooms', activeRooms);
    });
    // Admin terminates a call
    socket.on('admin-terminate-call', (data) => {
        const { roomId, adminId, reason } = data;
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('terminate-error', { roomId, error: 'Room not found' });
            return;
        }
        // Notify all participants the call was terminated by admin
        io.to(roomId).emit('call-ended', { reason: 'admin' });
        // Force all participants out of the room
        room.participants.forEach((participant, socketId) => {
            const participantSocket = io.sockets.sockets.get(socketId);
            if (participantSocket) {
                participantSocket.leave(roomId);
            }
        });
        // Clean up the room
        rooms.delete(roomId);
        // Confirm termination to the admin
        socket.emit('call-terminated', {
            roomId,
            adminId,
            terminatedAt: new Date(),
            participantCount: room.participants.size,
        });
        // Broadcast updated room list to all connected admins
        const activeRooms = Array.from(rooms.entries()).map(([id, r]) => ({
            roomId: id,
            callType: r.callType,
            participantCount: r.participants.size,
            participants: Array.from(r.participants.values()).map(p => ({
                userId: p.odUserId,
                userRole: p.odUserRole,
                joinedAt: p.odJoinedAt,
            })),
            createdAt: r.createdAt,
        }));
        adminNamespace.emit('active-rooms', activeRooms);
        console.log(`Admin ${adminId} terminated call in room ${roomId}${reason ? `: ${reason}` : ''}`);
    });
    // Admin blocks a conversation (messaging)
    socket.on('admin-block-conversation', (data) => {
        const { conversationId, adminId } = data;
        // Broadcast to any connected clients in this conversation
        io.emit('conversation-blocked', {
            conversationId,
            blockedBy: adminId,
        });
        socket.emit('conversation-block-confirmed', {
            conversationId,
            adminId,
            blockedAt: new Date(),
        });
        console.log(`Admin ${adminId} blocked conversation ${conversationId}`);
    });
    socket.on('disconnect', () => {
        console.log(`Admin disconnected: ${socket.id}`);
    });
});
// Broadcast room changes to admin namespace when participants join/leave
function notifyAdminsOfRoomChange() {
    const activeRooms = Array.from(rooms.entries()).map(([roomId, room]) => ({
        roomId,
        callType: room.callType,
        participantCount: room.participants.size,
        participants: Array.from(room.participants.values()).map(p => ({
            userId: p.odUserId,
            userRole: p.odUserRole,
            joinedAt: p.odJoinedAt,
        })),
        createdAt: room.createdAt,
    }));
    adminNamespace.emit('active-rooms', activeRooms);
}
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
        notifyAdminsOfRoomChange();
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