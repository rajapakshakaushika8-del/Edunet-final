import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Video, VideoOff, Phone, PhoneOff, Share, Users, Paperclip, Search, File, X } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import './StudyRoomChat.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const StudyRoomChat = ({ socket, roomId, currentUser, participants }) => {
  const { messages: contextMessages } = useSocket();
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    
    // Explicitly request history on mount/roomId change if needed
    // The backend emit for room-joined already sends messages, 
    // but this ensures we get it even if the component mounts later.
    socket.emit('request-room-history', roomId);

    // Listen for typing indicators
    socket.on('user-typing', (data) => {
      setTypingUsers(prev => {
        if (!prev.find(user => user.userId === data.userId)) {
          return [...prev, data];
        }
        return prev;
      });
    });

    socket.on('user-stopped-typing', (data) => {
      setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
    });

    // Listen for participant media changes
    socket.on('participant-media-change', (data) => {
      console.log('Participant media change:', data);
    });

    // Listen for screen sharing events
    socket.on('screen-share-started', (data) => {
      console.log('Screen sharing started by:', data.userEmail);
    });

    socket.on('screen-share-stopped', (data) => {
      console.log('Screen sharing stopped by user:', data.userId);
    });

    return () => {
      socket.off('user-typing');
      socket.off('user-stopped-typing');
      socket.off('participant-media-change');
      socket.off('screen-share-started');
      socket.off('screen-share-stopped');
    };
  }, [socket, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [contextMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !socket) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File is too large. Maximum 10MB allowed for chat.');
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const resp = await fetch(`${API_BASE_URL}/chat/upload`, { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('Upload failed');
      const data = await resp.json();
      socket.emit('send-message', { roomId, message: data.url, type: data.type, fileName: data.filename });
    } catch (err) {
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredMessages = searchQuery.trim() 
    ? contextMessages.filter(msg => 
        msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getMessageSender(msg.userId).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contextMessages;

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    const messageData = {
      roomId,
      message: newMessage.trim(),
      type: 'text'
    };

    socket.emit('send-message', messageData);
    setNewMessage('');
    
    // Stop typing indicator
    if (isTyping) {
      socket.emit('typing-stop', { roomId });
      setIsTyping(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!socket) return;

    // Start typing indicator
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      socket.emit('typing-start', { roomId });
    }

    // Reset typing timeout
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socket.emit('typing-stop', { roomId });
      }
    }, 1000);
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (socket) {
      socket.emit('media-state-change', {
        roomId,
        isMuted: newMutedState,
        videoEnabled: isVideoEnabled
      });
    }
  };

  const toggleVideo = () => {
    const newVideoState = !isVideoEnabled;
    setIsVideoEnabled(newVideoState);
    
    if (socket) {
      socket.emit('media-state-change', {
        roomId,
        isMuted,
        videoEnabled: newVideoState
      });
    }
  };

  const toggleCall = () => {
    setIsInCall(!isInCall);
    // Video calling logic will be implemented with WebRTC
  };

  const toggleScreenShare = () => {
    const newScreenShareState = !isScreenSharing;
    setIsScreenSharing(newScreenShareState);
    
    if (socket) {
      if (newScreenShareState) {
        socket.emit('start-screen-share', { roomId });
      } else {
        socket.emit('stop-screen-share', { roomId });
      }
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageSender = (userId) => {
    // Check if this is the current user (handle different ID formats)
    const isCurrentUser = userId === currentUser?.userId || 
                         userId === currentUser?.id || 
                         userId === currentUser?._id;
    
    if (isCurrentUser) return 'You';
    
    if (!participants || !Array.isArray(participants)) {
      // If no participants data, check if it's current user by name
      return 'Unknown User';
    }
    
    // Find participant by userId (handle different ID formats)
    const participant = participants.find(p => {
      if (!p) return false;
      return p.userId === userId || 
             p.id === userId || 
             p._id === userId;
    });
    
    if (participant) {
      return participant.name || participant.userName || participant.userEmail || `User ${userId.slice(-4)}`;
    }
    
    return `User ${userId.slice(-4)}`;
  };

  return (
    <div className="study-room-chat">
      {/* Chat Title & Search */}
      <div className="chat-header-actions">
        {isSearching ? (
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Search in chat..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button onClick={() => { setIsSearching(false); setSearchQuery(''); }}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <button className="search-toggle-btn" onClick={() => setIsSearching(true)} title="Search Chat">
            <Search size={18} />
          </button>
        )}
      </div>

      {/* Participants Bar */}
      <div className="participants-bar">
        <div className="participants-count">
          <Users size={18} />
          <span>{participants?.length || 0} participants</span>
        </div>
        
        <div className="media-controls">
          <button
            className={`media-btn ${isMuted ? 'muted' : 'active'}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          
          <button
            className={`media-btn ${isVideoEnabled ? 'active' : ''}`}
            onClick={toggleVideo}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
          </button>
          
          <button
            className={`media-btn ${isInCall ? 'active call-active' : ''}`}
            onClick={toggleCall}
            title={isInCall ? 'Leave call' : 'Join call'}
          >
            {isInCall ? <PhoneOff size={18} /> : <Phone size={18} />}
          </button>
          
          <button
            className={`media-btn ${isScreenSharing ? 'active' : ''}`}
            onClick={toggleScreenShare}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            <Share size={18} />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="chat-messages">
        {filteredMessages.map((message, index) => (
          <div
            key={message.id || index}
            className={`message ${(message.userId === currentUser?.userId || message.userId === currentUser?.id || message.userId === currentUser?._id) ? 'own-message' : 'other-message'}`}
          >
            <div className="message-header">
              <span className="sender-name">
                {getMessageSender(message.userId)}
              </span>
              <span className="message-time">
                {formatTime(message.timestamp)}
              </span>
            </div>
            <div className="message-content">
              {message.type === 'image' ? (
                <img src={message.message} alt="Shared" className="chat-image" />
              ) : message.type === 'file' ? (
                <div className="chat-file-attachment">
                  <File size={16} />
                  <a href={message.message} target="_blank" rel="noopener noreferrer">
                    {message.fileName || 'Attached File'}
                  </a>
                </div>
              ) : (
                message.message
              )}
            </div>
          </div>
        ))}
        
        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="typing-text">
              {typingUsers.map(user => user.userEmail).join(', ')} 
              {typingUsers.length === 1 ? ' is' : ' are'} typing...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <div className="input-container">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button 
            type="button" 
            className="attachment-btn"
            onClick={() => fileInputRef.current.click()}
            disabled={isUploading}
          >
            <Paperclip size={18} />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder={isUploading ? "Uploading file..." : "Type a message..."}
            className="message-input"
            maxLength={500}
            disabled={isUploading}
          />
          <button
            type="submit"
            className="send-button"
            disabled={!newMessage.trim() || isUploading}
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudyRoomChat;