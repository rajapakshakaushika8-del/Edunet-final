import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const API_ROOT = API_BASE_URL.replace(/\/api$/, '');
const SOCKET_SERVER_URL = process.env.REACT_APP_SERVER_URL || API_ROOT;

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const { user, token } = useAuth();

  // Initialize socket connection
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [token]);

  const addNotification = useCallback((notification) => {
    const id = Date.now().toString();
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep max 50 notifications
    
    // Auto-remove notification after 5 seconds for info/success, 10 seconds for warnings, keep errors
    if (notification.type !== 'error') {
      const timeout = notification.type === 'warning' ? 10000 : 5000;
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, timeout);
    }
  }, []);

  const removeNotification = useCallback(async (notificationId) => {
    // Mark as read in DB if it has an ID from database
    if (notificationId.length > 15 && token) { // Heuristic for MongoId
      try {
        await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    }
    setNotifications(prev => prev.filter(n => n.id !== notificationId && n._id !== notificationId));
  }, [token]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const initializeSocket = useCallback(() => {
    console.log('Initializing socket with user:', user, 'token exists:', !!token);
    
    if (!user || !token) {
      console.log('Cannot initialize socket - missing user or token');
      return null;
    }

    const socketUrl = SOCKET_SERVER_URL;
    console.log('Connecting to socket server:', socketUrl);
    
    const newSocket = io(socketUrl, {
      auth: {
        token,
        userId: user.id || user._id || user.userId,
        email: user.email,
        name: user.name
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
      setCurrentRoom(null);
      setOnlineUsers([]);
      setMessages([]);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
    });

    // Authentication events
    newSocket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data);
    });

    newSocket.on('auth_error', (error) => {
      console.error('Socket authentication error:', error);
      setConnected(false);
    });

    // Room events
    newSocket.on('room-joined', (data) => {
      console.log('Joined room:', data?.roomId || 'Unknown room');
      setCurrentRoom(data?.roomId || null);
      // Process participants to extract only needed properties
      const participants = data?.participants || [];
      if (!Array.isArray(participants)) {
        console.warn('Participants is not an array:', typeof participants);
        setOnlineUsers([]);
        return;
      }
      
      const processedParticipants = participants.map((participant, index) => {
        try {
          // Handle both direct participant data and nested structures
          if (participant?.user && typeof participant.user === 'object') {
            // Backend sends nested structure
            return {
              userId: participant.user.userId || participant.user._id || `temp-${index}`,
              userEmail: participant.user.email || 'Unknown',
              name: participant.user.name || 'Unknown User',
              joinedAt: participant.joinedAt || new Date().toISOString(),
              socketId: participant.socketId || ''
            };
          } else {
            // Direct structure
            return {
              userId: participant?.userId || `temp-${index}`,
              userEmail: participant?.userEmail || 'Unknown',
              name: participant?.name || 'Unknown User',
              joinedAt: participant?.joinedAt || new Date().toISOString(),
              socketId: participant?.socketId || ''
            };
          }
        } catch (error) {
          console.error('Error processing participant:', error, participant);
          return {
            userId: `error-${index}`,
            userEmail: 'Unknown',
            name: 'Unknown User',
            joinedAt: new Date().toISOString(),
            socketId: ''
          };
        }
      });
      setOnlineUsers(processedParticipants);
      
      // Store initial messages from history
      if (data?.messages && Array.isArray(data.messages)) {
        console.log('Setting initial room messages:', data.messages.length);
        setMessages(data.messages);
      }
    });

    newSocket.on('room-left', (data) => {
      console.log('Left room:', data.roomId);
      if (currentRoom === data.roomId) {
        setCurrentRoom(null);
        setOnlineUsers([]);
      }
    });

    newSocket.on('user-joined', (data) => {
      console.log('User joined room:', data?.userId || 'Unknown user');
      setOnlineUsers(prev => {
        const userId = data?.userId || data?.user?.userId;
        if (!userId) {
          console.warn('Received user-joined event without valid userId');
          return prev;
        }
        const exists = prev.find(u => u.userId === userId);
        if (!exists) {
          // Extract only the needed properties to prevent object rendering errors
          const userData = {
            userId: userId,
            userEmail: data?.userEmail || data?.user?.email || 'Unknown',
            name: data?.name || data?.user?.name || 'Unknown User',
            joinedAt: data?.joinedAt || new Date().toISOString(),
            socketId: data?.socketId || ''
          };
          return [...prev, userData];
        }
        return prev;
      });
      
      addNotification({
        type: 'info',
        message: `${data.userEmail} joined the room`,
        timestamp: new Date().toISOString()
      });
    });

    newSocket.on('user-left', (data) => {
      console.log('User left room:', data);
      setOnlineUsers(prev => prev.filter(u => u.userId !== data.userId));
      
      addNotification({
        type: 'info',
        message: `${data.userEmail} left the room`,
        timestamp: new Date().toISOString()
      });
    });

    // Message events
    newSocket.on('new-message', (message) => {
      console.log('New message received in context:', message.id);
      setMessages(prev => {
        // Prevent duplicate messages
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    newSocket.on('room-history', (data) => {
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    });

    // Notification events
    newSocket.on('notification', (notification) => {
      addNotification({
        ...notification,
        timestamp: new Date().toISOString()
      });
    });

    // Session ended by creator
    newSocket.on('session-ended', (data) => {
      console.log('Session ended by creator:', data);
      
      // Reset current room and online users
      setCurrentRoom(null);
      setOnlineUsers([]);
      
      addNotification({
        type: 'warning',
        message: data.message || 'Study room session has been ended',
        timestamp: new Date().toISOString()
      });
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      addNotification({
        type: 'error',
        message: error.message || 'An error occurred',
        timestamp: new Date().toISOString()
      });
    });

    setSocket(newSocket);

    return newSocket;
  }, [user, token, currentRoom, addNotification]);

  // Clean up socket connection
  const disconnectSocket = useCallback(() => {
    if (socket) {
      console.log('Disconnecting socket');
      socket.disconnect();
      setSocket(null);
      setConnected(false);
      setCurrentRoom(null);
      setOnlineUsers([]);
      setMessages([]);
    }
  }, [socket]);

  // Join a study room
  const joinRoom = useCallback((roomId, roomData = {}) => {
    if (socket && connected) {
      console.log('Joining room:', roomId);
      socket.emit('join-study-room', {
        roomId,
        userInfo: {
          userId: user?.userId || user?._id,
          name: user?.name,
          email: user?.email,
          role: user?.role || 'member'
        },
        ...roomData
      });
    } else {
      console.warn('Cannot join room: Socket not connected');
    }
  }, [socket, connected, user]);

  // Leave current room
  const leaveRoom = useCallback(() => {
    if (socket && connected && currentRoom) {
      console.log('Leaving room:', currentRoom);
      socket.emit('leave-study-room', currentRoom);
      setCurrentRoom(null);
      setOnlineUsers([]);
      setMessages([]);
    }
  }, [socket, connected, currentRoom]);

  // Send a message
  const sendMessage = useCallback((roomId, message, type = 'text') => {
    if (socket && connected) {
      socket.emit('send-message', {
        roomId,
        message,
        type
      });
    }
  }, [socket, connected]);

  // Send typing indicator
  const sendTyping = useCallback((roomId, isTyping) => {
    if (socket && connected) {
      socket.emit(isTyping ? 'typing-start' : 'typing-stop', { roomId });
    }
  }, [socket, connected]);

  // Whiteboard drawing
  const sendWhiteboardDraw = useCallback((roomId, drawData) => {
    if (socket && connected) {
      socket.emit('whiteboard-draw', {
        roomId,
        ...drawData
      });
    }
  }, [socket, connected]);

  // Video call signaling
  const sendCallSignal = useCallback((roomId, userId, signal) => {
    if (socket && connected) {
      socket.emit('send-call-signal', {
        roomId,
        userId,
        signal
      });
    }
  }, [socket, connected]);

  // Join video call
  const joinCall = useCallback((roomId) => {
    if (socket && connected) {
      socket.emit('join-call', { roomId });
    }
  }, [socket, connected]);

  // Leave video call
  const leaveCall = useCallback((roomId) => {
    if (socket && connected) {
      socket.emit('leave-call', { roomId });
    }
  }, [socket, connected]);

  // Update media status
  const updateMediaStatus = useCallback((roomId, mediaStatus) => {
    if (socket && connected) {
      socket.emit('media-status-change', {
        roomId,
        ...mediaStatus
      });
    }
  }, [socket, connected]);

  // Screen sharing
  const startScreenShare = useCallback((roomId) => {
    if (socket && connected) {
      socket.emit('start-screen-share', { roomId });
    }
  }, [socket, connected]);

  const stopScreenShare = useCallback((roomId) => {
    if (socket && connected) {
      socket.emit('stop-screen-share', { roomId });
    }
  }, [socket, connected]);

  // Initialize socket when user is authenticated
  useEffect(() => {
    console.log('Socket useEffect triggered - user:', !!user, 'token:', !!token);
    
    if (user && token && !socket) {
      console.log('Initializing new socket connection...');
      initializeSocket();
      fetchNotifications();
    } else if (!user || !token) {
      console.log('No user/token - disconnecting socket');
      disconnectSocket();
    }
  }, [user, token, socket, initializeSocket, fetchNotifications, disconnectSocket]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  const contextValue = {
    // Socket state
    socket,
    connected,
    currentRoom,
    onlineUsers,
    messages,
    setMessages,
    
    // Room management
    joinRoom,
    leaveRoom,
    
    // Messaging
    sendMessage,
    sendTyping,
    
    // Whiteboard
    sendWhiteboardDraw,
    
    // Video conferencing
    sendCallSignal,
    joinCall,
    leaveCall,
    updateMediaStatus,
    startScreenShare,
    stopScreenShare,
    
    // Notifications
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    
    // Utilities
    initializeSocket,
    disconnectSocket
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;