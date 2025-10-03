const jwt = require('jsonwebtoken');
const Room = require('../models/Room');
const User = require('../models/User');

// Store active connections
const activeConnections = new Map();

const initializeSocket = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.username = user.username;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.username} (${socket.id})`);
    activeConnections.set(socket.userId, socket.id);

    // Join a room
    socket.on('join-room', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId);

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Check if user is a participant
        const isParticipant = room.participants.some(
          p => p.user.toString() === socket.userId
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'You are not a participant in this room' });
          return;
        }

        // Update socket ID for the participant
        const participantIndex = room.participants.findIndex(
          p => p.user.toString() === socket.userId
        );
        room.participants[participantIndex].socketId = socket.id;
        
        // Don't automatically change room status - let creator control it
        
        await room.save();

        // Join socket room
        socket.join(roomId);
        socket.currentRoom = roomId;

        // Notify others in the room
        socket.to(roomId).emit('user-joined', {
          userId: socket.userId,
          username: socket.username,
          socketId: socket.id
        });

        // Send current participants to the joining user
        const populatedRoom = await Room.findById(roomId)
          .populate('participants.user', 'username');

        socket.emit('room-joined', {
          room: populatedRoom,
          participants: populatedRoom.participants.map(p => ({
            userId: p.user._id,
            username: p.user.username,
            socketId: p.socketId
          }))
        });

        console.log(`${socket.username} joined room ${roomId}`);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave room
    socket.on('leave-room', async ({ roomId }) => {
      try {
        if (socket.currentRoom === roomId) {
          socket.leave(roomId);
          socket.to(roomId).emit('user-left', {
            userId: socket.userId,
            username: socket.username
          });

          // Update room participants
          const room = await Room.findById(roomId);
          if (room) {
            const participantIndex = room.participants.findIndex(
              p => p.user.toString() === socket.userId
            );
            if (participantIndex !== -1) {
              room.participants[participantIndex].socketId = null;
              
              await room.save();
            }
          }

          socket.currentRoom = null;
          console.log(`${socket.username} left room ${roomId}`);
        }
      } catch (error) {
        console.error('Leave room error:', error);
      }
    });

    // Text chat message
    socket.on('chat-message', async ({ roomId, message }) => {
      try {
        if (!socket.currentRoom || socket.currentRoom !== roomId) {
          socket.emit('error', { message: 'You are not in this room' });
          return;
        }

        const chatMessage = {
          userId: socket.userId,
          username: socket.username,
          message: message.trim(),
          timestamp: new Date()
        };

        // Broadcast message to all users in the room
        io.to(roomId).emit('chat-message', chatMessage);

        console.log(`Message in room ${roomId} from ${socket.username}: ${message}`);
      } catch (error) {
        console.error('Chat message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // WebRTC Signaling for audio
    socket.on('webrtc-offer', ({ roomId, offer, targetSocketId }) => {
      socket.to(targetSocketId).emit('webrtc-offer', {
        offer,
        senderSocketId: socket.id,
        senderId: socket.userId,
        senderUsername: socket.username
      });
      console.log(`WebRTC offer sent from ${socket.username} to ${targetSocketId}`);
    });

    socket.on('webrtc-answer', ({ roomId, answer, targetSocketId }) => {
      socket.to(targetSocketId).emit('webrtc-answer', {
        answer,
        senderSocketId: socket.id,
        senderId: socket.userId,
        senderUsername: socket.username
      });
      console.log(`WebRTC answer sent from ${socket.username} to ${targetSocketId}`);
    });

    socket.on('webrtc-ice-candidate', ({ roomId, candidate, targetSocketId }) => {
      socket.to(targetSocketId).emit('webrtc-ice-candidate', {
        candidate,
        senderSocketId: socket.id
      });
    });

    // Room status update
    socket.on('room-status-updated', async ({ roomId, status }) => {
      try {
        const room = await Room.findById(roomId);
        
        if (room && room.creator.toString() === socket.userId) {
          io.to(roomId).emit('room-status-updated', { status });
          console.log(`Room ${roomId} status updated to ${status}`);
        }
      } catch (error) {
        console.error('Room status update error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.username} (${socket.id})`);
      activeConnections.delete(socket.userId);

      try {
        // If user was in a room, notify others
        if (socket.currentRoom) {
          socket.to(socket.currentRoom).emit('user-disconnected', {
            userId: socket.userId,
            username: socket.username
          });

          // Update room participants
          const room = await Room.findById(socket.currentRoom);
          if (room) {
            const participantIndex = room.participants.findIndex(
              p => p.user.toString() === socket.userId
            );
            if (participantIndex !== -1) {
              room.participants[participantIndex].socketId = null;
              await room.save();
            }
          }
        }
      } catch (error) {
        console.error('Disconnect cleanup error:', error);
      }
    });

    // Typing indicator
    socket.on('typing-start', ({ roomId }) => {
      if (socket.currentRoom === roomId) {
        socket.to(roomId).emit('user-typing', {
          userId: socket.userId,
          username: socket.username
        });
      }
    });

    socket.on('typing-stop', ({ roomId }) => {
      if (socket.currentRoom === roomId) {
        socket.to(roomId).emit('user-stopped-typing', {
          userId: socket.userId
        });
      }
    });
  });

  return io;
};

module.exports = { initializeSocket, activeConnections };