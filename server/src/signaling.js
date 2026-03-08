/**
 * Socket.io Signaling Server for WebRTC Telemedicine
 * Handles peer connection signaling for video consultations.
 */

function initSignalingServer(server) {
    const { Server } = require('socket.io');
    
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    // Track active consultation rooms
    const activeRooms = new Map();

    io.on('connection', (socket) => {
        console.log(`[Signaling] Client connected: ${socket.id}`);

        // Join a consultation room
        socket.on('join-room', ({ roomId, userId, userName, role }) => {
            socket.join(roomId);
            
            if (!activeRooms.has(roomId)) {
                activeRooms.set(roomId, new Set());
            }
            activeRooms.get(roomId).add({ socketId: socket.id, userId, userName, role });

            // Notify others in the room
            socket.to(roomId).emit('user-joined', {
                socketId: socket.id,
                userId,
                userName,
                role
            });

            console.log(`[Signaling] ${userName} (${role}) joined room ${roomId}`);
        });

        // WebRTC signaling: offer
        socket.on('offer', ({ roomId, offer, to }) => {
            socket.to(to || roomId).emit('offer', {
                offer,
                from: socket.id
            });
        });

        // WebRTC signaling: answer
        socket.on('answer', ({ roomId, answer, to }) => {
            socket.to(to || roomId).emit('answer', {
                answer,
                from: socket.id
            });
        });

        // WebRTC signaling: ICE candidate
        socket.on('ice-candidate', ({ roomId, candidate, to }) => {
            socket.to(to || roomId).emit('ice-candidate', {
                candidate,
                from: socket.id
            });
        });

        // In-session text chat
        socket.on('chat-message', ({ roomId, message, userName }) => {
            io.to(roomId).emit('chat-message', {
                message,
                userName,
                from: socket.id,
                timestamp: new Date().toISOString()
            });
        });

        // End consultation
        socket.on('end-call', ({ roomId }) => {
            io.to(roomId).emit('call-ended', { by: socket.id });
            activeRooms.delete(roomId);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            // Clean up from all rooms
            for (const [roomId, participants] of activeRooms) {
                for (const p of participants) {
                    if (p.socketId === socket.id) {
                        participants.delete(p);
                        socket.to(roomId).emit('user-left', {
                            socketId: socket.id,
                            userId: p.userId
                        });
                        break;
                    }
                }
                if (participants.size === 0) {
                    activeRooms.delete(roomId);
                }
            }
            console.log(`[Signaling] Client disconnected: ${socket.id}`);
        });
    });

    console.log('📡 WebRTC Signaling Server initialized');
    return io;
}

module.exports = { initSignalingServer };
