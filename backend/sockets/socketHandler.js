import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';

// Helper to save and emit notification
const sendNotification = async (io, recipientId, notificationData) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      ...notificationData
    });
    await notification.save();

    // Find recipient socket
    const recipient = activeUsers.get(recipientId.toString());
    if (recipient && recipient.socketId) {
      io.to(recipient.socketId).emit('notification', notification);
    }
  } catch (err) {
    console.error('Error sending notification:', err);
  }
};

// Store active connections and rooms
const activeUsers = new Map();
const studyRooms = new Map();
const whiteboardData = new Map();

// Socket authentication middleware
const authenticateSocket = (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'edunet-secret-key');
    socket.userId = decoded.userId || decoded.id;
    socket.userEmail = decoded.email || socket.handshake.auth.email || 'Unknown User';
    socket.userName = decoded.name || socket.handshake.auth.name || 'Unknown User';
    
    console.log('Socket authenticated:', { 
      userId: socket.userId, 
      email: socket.userEmail,
      name: socket.userName 
    });
    
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};

// Initialize Socket.IO
export const initializeSocket = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.userName || socket.userEmail})`);
    
    // Store user connection
    activeUsers.set(socket.userId, {
      socketId: socket.id,
      email: socket.userEmail,
      status: 'online',
      currentRoom: null
    });

    // Emit user online status
    socket.broadcast.emit('user-online', {
      userId: socket.userId,
      email: socket.userEmail
    });

    // Handle joining study room
    socket.on('join-study-room', async (data) => {
      try {
        const { roomId, userInfo } = data;
        
        // Leave previous room if any
        if (activeUsers.get(socket.userId)?.currentRoom) {
          socket.leave(activeUsers.get(socket.userId).currentRoom);
        }
        
        // Join new room
        socket.join(roomId);
        
        // Update user's current room
        const user = activeUsers.get(socket.userId);
        user.currentRoom = roomId;
        activeUsers.set(socket.userId, user);
        
        // Initialize room if it doesn't exist
        if (!studyRooms.has(roomId)) {
          studyRooms.set(roomId, {
            id: roomId,
            participants: new Map(),
            messages: [],
            whiteboardData: [],
            videoEnabled: false,
            screenSharing: false
          });
        }
        
        // Add user to room participants
        const room = studyRooms.get(roomId);
        room.participants.set(socket.userId, {
          ...userInfo,
          socketId: socket.id,
          joinedAt: new Date(),
          isMuted: false,
          videoEnabled: false,
          isScreenSharing: false
        });
        
        // Send room info to user with simplified participant data
        const simplifiedParticipants = Array.from(room.participants.values()).map(participant => ({
          userId: participant.userId || participant.user?.userId || participant.user?._id,
          userEmail: participant.userEmail || participant.user?.email,
          name: participant.name || participant.user?.name,
          joinedAt: participant.joinedAt,
          socketId: participant.socketId
        }));
        
        // Fetch history from DB
        const dbMessages = await Message.find({ roomId })
           .sort({ timestamp: -1 })
           .limit(50);
        const history = dbMessages.reverse();

        socket.emit('room-joined', {
          roomId,
          participants: simplifiedParticipants,
          messages: history,
          whiteboardData: whiteboardData.get(roomId) || []
        });
        
        // Notify others in room
        socket.to(roomId).emit('user-joined', {
          userId: socket.userId,
          userEmail: socket.userEmail,
          name: socket.userName,
          socketId: socket.id
        });

        // Save join notification for offline/history (Optional: only if specifically required)
        // For now, we emit transient as existing code did, but persistence is ready.
        
        console.log(`User ${socket.userEmail} joined room ${roomId}`);
        
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join study room' });
      }
    });

    // Handle leaving study room
    socket.on('leave-study-room', (roomId) => {
      handleLeaveRoom(socket, roomId);
    });

    // Handle chat messages
    socket.on('send-message', async (data) => {
      try {
        const { roomId, message, type = 'text' } = data;
        const user = activeUsers.get(socket.userId);
        
        if (!user?.currentRoom || user.currentRoom !== roomId) {
          socket.emit('error', { message: 'You must be in the room to send messages' });
          return;
        }
        
        const messageObj = {
          id: uuidv4(),
          userId: socket.userId,
          userEmail: socket.userEmail,
          message,
          type,
          timestamp: new Date(),
          edited: false
        };
        
          // Store message in DB
          try {
            const newMessage = new Message({
              roomId,
              userId: socket.userId,
              userName: socket.userName,
              userEmail: socket.userEmail,
              message,
              type
            });
            await newMessage.save();
            
            // Broadcast message back to room
            io.to(roomId).emit('new-message', {
              id: newMessage._id,
              userId: socket.userId,
              userEmail: socket.userEmail,
              message,
              type,
              timestamp: newMessage.timestamp
            });
          } catch (dbError) {
            console.error('Failed to save message to DB:', dbError);
            // Fallback to in-memory broadcast if DB fails
            const fallbackMsg = {
              id: uuidv4(),
              userId: socket.userId,
              userEmail: socket.userEmail,
              message,
              type,
              timestamp: new Date()
            };
            io.to(roomId).emit('new-message', fallbackMsg);
        }
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle whiteboard events
    socket.on('whiteboard-draw', (data) => {
      try {
        const { roomId, drawingData } = data;
        const user = activeUsers.get(socket.userId);
        
        if (!user?.currentRoom || user.currentRoom !== roomId) {
          return;
        }
        
        // Store whiteboard data
        if (!whiteboardData.has(roomId)) {
          whiteboardData.set(roomId, []);
        }
        
        const roomWhiteboard = whiteboardData.get(roomId);
        roomWhiteboard.push({
          ...drawingData,
          userId: socket.userId,
          timestamp: new Date()
        });
        
        // Keep only last 1000 drawing actions
        if (roomWhiteboard.length > 1000) {
          whiteboardData.set(roomId, roomWhiteboard.slice(-1000));
        }
        
        // Broadcast to other users in room
        socket.to(roomId).emit('whiteboard-update', drawingData);
        
      } catch (error) {
        console.error('Whiteboard error:', error);
      }
    });

    // Handle whiteboard clear
    socket.on('whiteboard-clear', (data) => {
      try {
        const { roomId } = data;
        const user = activeUsers.get(socket.userId);
        
        if (!user?.currentRoom || user.currentRoom !== roomId) {
          return;
        }
        
        // Clear whiteboard data
        whiteboardData.set(roomId, []);
        
        // Broadcast clear to room
        io.to(roomId).emit('whiteboard-cleared');
        
      } catch (error) {
        console.error('Whiteboard clear error:', error);
      }
    });

    // Handle room history requests
    socket.on('request-room-history', async (roomId) => {
      try {
        const dbMessages = await Message.find({ roomId })
          .sort({ timestamp: -1 })
          .limit(100);
        
        socket.emit('room-history', {
          messages: dbMessages.reverse(),
          whiteboardData: whiteboardData.get(roomId) || []
        });
      } catch (error) {
        console.error('Request history error:', error);
      }
    });

    // Handle video call signaling
    socket.on('video-offer', (data) => {
      try {
        const { roomId, targetUserId, offer } = data;
        const targetUser = Array.from(activeUsers.values()).find(u => u.socketId && activeUsers.get(targetUserId)?.socketId === u.socketId);
        
        if (targetUser) {
          socket.to(targetUser.socketId).emit('video-offer', {
            fromUserId: socket.userId,
            offer
          });
        }
      } catch (error) {
        console.error('Video offer error:', error);
      }
    });

    socket.on('video-answer', (data) => {
      try {
        const { targetUserId, answer } = data;
        const targetUser = Array.from(activeUsers.values()).find(u => u.socketId && activeUsers.get(targetUserId)?.socketId === u.socketId);
        
        if (targetUser) {
          socket.to(targetUser.socketId).emit('video-answer', {
            fromUserId: socket.userId,
            answer
          });
        }
      } catch (error) {
        console.error('Video answer error:', error);
      }
    });

    socket.on('ice-candidate', (data) => {
      try {
        const { targetUserId, candidate } = data;
        const targetUser = Array.from(activeUsers.values()).find(u => u.socketId && activeUsers.get(targetUserId)?.socketId === u.socketId);
        
        if (targetUser) {
          socket.to(targetUser.socketId).emit('ice-candidate', {
            fromUserId: socket.userId,
            candidate
          });
        }
      } catch (error) {
        console.error('ICE candidate error:', error);
      }
    });

    // Handle media state changes
    socket.on('media-state-change', (data) => {
      try {
        const { roomId, isMuted, videoEnabled } = data;
        const user = activeUsers.get(socket.userId);
        
        if (!user?.currentRoom || user.currentRoom !== roomId) {
          return;
        }
        
        const room = studyRooms.get(roomId);
        if (room && room.participants.has(socket.userId)) {
          const participant = room.participants.get(socket.userId);
          participant.isMuted = isMuted;
          participant.videoEnabled = videoEnabled;
          
          // Broadcast state change to room
          socket.to(roomId).emit('participant-media-change', {
            userId: socket.userId,
            isMuted,
            videoEnabled
          });
        }
      } catch (error) {
        console.error('Media state change error:', error);
      }
    });

    // Handle screen sharing
    socket.on('start-screen-share', (data) => {
      try {
        const { roomId } = data;
        const user = activeUsers.get(socket.userId);
        
        if (!user?.currentRoom || user.currentRoom !== roomId) {
          return;
        }
        
        const room = studyRooms.get(roomId);
        if (room && room.participants.has(socket.userId)) {
          const participant = room.participants.get(socket.userId);
          participant.isScreenSharing = true;
          
          // Notify room about screen sharing
          socket.to(roomId).emit('screen-share-started', {
            userId: socket.userId,
            userEmail: socket.userEmail
          });
        }
      } catch (error) {
        console.error('Screen share start error:', error);
      }
    });

    socket.on('stop-screen-share', (data) => {
      try {
        const { roomId } = data;
        const user = activeUsers.get(socket.userId);
        
        if (!user?.currentRoom || user.currentRoom !== roomId) {
          return;
        }
        
        const room = studyRooms.get(roomId);
        if (room && room.participants.has(socket.userId)) {
          const participant = room.participants.get(socket.userId);
          participant.isScreenSharing = false;
          
          // Notify room about stopped screen sharing
          socket.to(roomId).emit('screen-share-stopped', {
            userId: socket.userId
          });
        }
      } catch (error) {
        console.error('Screen share stop error:', error);
      }
    });

    // Handle notifications
    socket.on('send-notification', (data) => {
      try {
        const { targetUserId, title, message, type = 'info' } = data;
        
        if (activeUsers.has(targetUserId)) {
          const targetUser = activeUsers.get(targetUserId);
          socket.to(targetUser.socketId).emit('notification', {
            id: uuidv4(),
            title,
            message,
            type,
            fromUserId: socket.userId,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Notification error:', error);
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user-typing', {
        userId: socket.userId,
        userEmail: socket.userEmail
      });
    });

    socket.on('typing-stop', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user-stopped-typing', {
        userId: socket.userId
      });
    });

    // Handle room ended by creator
    socket.on('room-ended', (data) => {
      const { roomId, endedBy } = data;
      console.log(`Room ${roomId} ended by ${endedBy}`);
      
      // Notify all participants in the room
      socket.to(roomId).emit('session-ended', {
        roomId,
        endedBy,
        message: `Study room session has been ended by ${endedBy}`,
        timestamp: new Date().toISOString()
      });
      
      // Clean up the room from memory
      if (studyRooms.has(roomId)) {
        const room = studyRooms.get(roomId);
        
        // Remove all participants from the room
        if (room.participants) {
          room.participants.forEach((participant, userId) => {
            const userConnection = activeUsers.get(userId);
            if (userConnection) {
              userConnection.currentRoom = null;
              activeUsers.set(userId, userConnection);
            }
          });
        }
        
        // Remove room data
        studyRooms.delete(roomId);
        whiteboardData.delete(roomId);
      }
      
      // Make all participants leave the socket room
      const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
      if (socketsInRoom) {
        socketsInRoom.forEach(socketId => {
          const participantSocket = io.sockets.sockets.get(socketId);
          if (participantSocket) {
            participantSocket.leave(roomId);
          }
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      const user = activeUsers.get(socket.userId);
      if (user?.currentRoom) {
        handleLeaveRoom(socket, user.currentRoom);
      }
      
      // Remove from active users
      activeUsers.delete(socket.userId);
      
      // Broadcast user offline
      socket.broadcast.emit('user-offline', {
        userId: socket.userId
      });
    });
  });

  // Helper function to handle leaving room
  const handleLeaveRoom = (socket, roomId) => {
    try {
      if (studyRooms.has(roomId)) {
        const room = studyRooms.get(roomId);
        room.participants.delete(socket.userId);
        
        // Update user's current room
        const user = activeUsers.get(socket.userId);
        if (user) {
          user.currentRoom = null;
        }
        
        // Leave socket room
        socket.leave(roomId);
        
        // Notify other participants with simplified data
        socket.to(roomId).emit('user-left', {
          userId: socket.userId,
          userEmail: socket.userEmail
        });
        
        // Don't delete empty rooms immediately, keep them for history
        // They will be cleaned up when ended or after a long timeout
        
        console.log(`User ${socket.userEmail} left room ${roomId}`);
      }
    } catch (error) {
      console.error('Leave room error:', error);
    }
  };

  // Periodic cleanup of inactive data
  setInterval(() => {
    // Only clean up rooms that have been empty for a long time (simulated by just keeping them alive for now)
    // Real proper cleanup happens on 'room-ended'
  }, 60 * 60 * 1000); // Check every hour
};

export { activeUsers, studyRooms, whiteboardData };