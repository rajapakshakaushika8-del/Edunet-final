import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Video, 
  Edit3, 
  Users, 
  Settings, 
  Share,
  BookOpen,
  ArrowLeft,
  Maximize,
  Minimize
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { studyRoomAPI } from '../../services/api';
import StudyRoomChat from '../chat/StudyRoomChat';
import VideoConference from '../video/VideoConference';
import InteractiveWhiteboard from '../whiteboard/InteractiveWhiteboard';
import LoadingSpinner from '../common/LoadingSpinner';
import './StudyRoomDetail.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const StudyRoomDetail = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    socket, 
    connected, 
    currentRoom, 
    onlineUsers, 
    joinRoom, 
    leaveRoom 
  } = useSocket();

  // Debug logging
  useEffect(() => {
    console.log('StudyRoomDetail Debug:', {
      user: !!user,
      userName: user?.name,
      socket: !!socket,
      connected,
      roomId,
      currentRoom
    });
  }, [user, socket, connected, roomId, currentRoom]);

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [roomSettings] = useState({
    allowChat: true,
    allowVideo: true,
    allowWhiteboard: true,
    allowScreenShare: true
  });
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const videoConferenceRef = useRef(null);

  // Fetch room details
  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        setLoading(true);
        console.log('Fetching room details for roomId:', roomId);
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('401: No authentication token found');
        }
        const response = await fetch(`${API_BASE_URL}/study-rooms/${roomId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`${response.status}: ${errorData.message || 'Failed to fetch room details'}`);
        }

        const roomData = await response.json();
        console.log('Room data received:', roomData);
        
        // Validate room data structure
        if (!roomData || !roomData._id) {
          throw new Error('Invalid room data received from server');
        }
        
        setRoom(roomData);
        setError(null);
      } catch (error) {
        console.error('Error fetching room details:', error);
        
        let errorMessage = 'Failed to load study room. Please try again.';
        
        if (error.message.includes('fetch')) {
          errorMessage = 'Unable to connect to server. Please check your connection.';
        } else if (error.message.includes('404')) {
          errorMessage = 'Study room not found. It may have been deleted.';
        } else if (error.message.includes('403')) {
          errorMessage = 'You do not have permission to access this study room.';
        } else if (error.message.includes('401')) {
          errorMessage = 'Please log in to access this study room.';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (roomId && roomId.length > 0) {
      fetchRoomDetails();
    } else {
      setError('Invalid room ID');
      setLoading(false);
    }
  }, [roomId]);

  // Monitor connection status
  useEffect(() => {
    if (!socket) {
      setConnectionStatus('no-socket');
    } else if (!connected) {
      setConnectionStatus('connecting');
    } else if (!room) {
      setConnectionStatus('loading-room');
    } else if (currentRoom !== roomId) {
      setConnectionStatus('joining-room');
    } else {
      setConnectionStatus('connected');
    }
  }, [socket, connected, room, currentRoom, roomId]);

  // Join room when socket connects and room is loaded
  useEffect(() => {
    let joinTimeout;
    
    if (socket && connected && room && user) {
      console.log('Attempting to join room:', roomId, 'User:', user.name);
      setConnectionStatus('joining-room');
      
      joinRoom(roomId, {
        roomName: room.name,
        subject: room.subject
      });
      
      // Set timeout for room joining
      joinTimeout = setTimeout(() => {
        if (currentRoom !== roomId) {
          console.error('Room join timeout - no response from server');
          setError('Failed to connect to study room. The server might be busy or the room may no longer exist. Please try refreshing the page or check if the backend server is running.');
        }
      }, 10000); // 10 second timeout
    }

    // Clear timeout when successfully joined
    if (currentRoom === roomId && joinTimeout) {
      clearTimeout(joinTimeout);
      setConnectionStatus('connected');
    }

    // Leave room on unmount
    return () => {
      if (joinTimeout) {
        clearTimeout(joinTimeout);
      }
      if (socket && connected && currentRoom === roomId) {
        leaveRoom(roomId);
      }
    };
  }, [socket, connected, room, roomId, user, joinRoom, leaveRoom, currentRoom]);

  // Handle session ended by creator
  useEffect(() => {
    if (!socket) return;

    const handleSessionEnded = (data) => {
      console.log('Session ended:', data);
      
      // Clean up video conference
      if (videoConferenceRef.current) {
        videoConferenceRef.current.cleanup();
      }
      
      // Show notification to user
      alert(`Study room session has been ended by ${data.endedBy || 'the creator'}`);
      
      // Redirect to dashboard
      navigate('/dashboard');
    };

    socket.on('session-ended', handleSessionEnded);

    return () => {
      socket.off('session-ended', handleSessionEnded);
    };
  }, [socket, navigate]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const shareRoomLink = () => {
    const roomUrl = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(roomUrl).then(() => {
      if (socket) {
        socket.emit('notification', {
          type: 'success',
          message: 'Room link copied to clipboard!'
        });
      }
    });
  };

  const handleEndStudyRoom = async () => {
    if (window.confirm('Are you sure you want to end this study room session? This will disconnect all participants and mark the session as completed.')) {
      try {
        // Stop video conference and cleanup media
        if (videoConferenceRef.current) {
          videoConferenceRef.current.cleanup();
        }
        
        await studyRoomAPI.end(roomId);
        
        // Emit to socket to notify all participants
        if (socket) {
          socket.emit('room-ended', { roomId, endedBy: user.name });
        }
        
        alert('Study room session has been ended successfully.');
        // Redirect to dashboard
        navigate('/dashboard');
      } catch (error) {
        console.error('Error ending study room:', error);
        alert('Failed to end study room. Please try again.');
      }
    }
  };



  if (loading || (room && currentRoom !== roomId && connectionStatus !== 'connected')) {
    return (
      <div className="study-room-loading">
        <LoadingSpinner />
        {connectionStatus === 'no-socket' && <p>Initializing connection...</p>}
        {connectionStatus === 'connecting' && <p>Connecting to server...</p>}
        {connectionStatus === 'loading-room' && <p>Loading study room...</p>}
        {connectionStatus === 'joining-room' && (
          <div>
            <p>Connecting to study room...</p>
            <p style={{fontSize: '0.9em', color: '#666', marginTop: '10px'}}>
              If this takes too long, try refreshing the page or check if the backend server is running.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="study-room-error">
        <div className="error-content">
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <button onClick={handleBackToDashboard} className="btn-primary">
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="study-room-error">
        <div className="error-content">
          <h2>Room not found</h2>
          <p>The study room you're looking for doesn't exist or has been deleted.</p>
          <button onClick={handleBackToDashboard} className="btn-primary">
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`study-room-detail ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Room Header */}
      <div className="room-header">
        <div className="room-info">
          <div className="room-breadcrumb">
            <button onClick={handleBackToDashboard} className="back-btn">
              <ArrowLeft size={18} />
            </button>
            <div className="room-title">
              <h1>{room.name}</h1>
              <div className="room-meta">
                <span className="room-subject">
                  <BookOpen size={14} />
                  {room.subject}
                </span>
                <span className="room-participants">
                  <Users size={14} />
                  {onlineUsers.length} online
                </span>
                <span className="room-status">
                  <div className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></div>
                  {connected ? 'Connected' : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="room-actions">
            <button onClick={shareRoomLink} className="action-btn" title="Share room link">
              <Share size={18} />
            </button>
            {user && room.createdBy && (room.createdBy._id === user.id || room.createdBy === user.id) && (
              <button 
                onClick={handleEndStudyRoom} 
                className="btn-danger end-session-btn" 
                title="End study room session"
              >
                End Session
              </button>
            )}
            <button onClick={toggleFullscreen} className="action-btn" title="Toggle fullscreen">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
            <button className="action-btn" title="Room settings">
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="room-tabs">
          <button
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => handleTabChange('chat')}
            disabled={!roomSettings.allowChat}
          >
            <MessageSquare size={18} />
            Chat
            {onlineUsers.length > 0 && (
              <span className="tab-badge">{onlineUsers.length}</span>
            )}
          </button>
          
          <button
            className={`tab-btn ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => handleTabChange('video')}
            disabled={!roomSettings.allowVideo}
          >
            <Video size={18} />
            Video
          </button>
          
          <button
            className={`tab-btn ${activeTab === 'whiteboard' ? 'active' : ''}`}
            onClick={() => handleTabChange('whiteboard')}
            disabled={!roomSettings.allowWhiteboard}
          >
            <Edit3 size={18} />
            Whiteboard
          </button>
        </div>
      </div>

      {/* Room Content */}
      <div className="room-content">
        {activeTab === 'chat' && roomSettings.allowChat && (
          <StudyRoomChat
            socket={socket}
            roomId={roomId}
            currentUser={user}
            participants={onlineUsers}
          />
        )}
        
        {activeTab === 'video' && roomSettings.allowVideo && (
          <VideoConference
            ref={videoConferenceRef}
            socket={socket}
            roomId={roomId}
            currentUser={user}
            participants={onlineUsers}
          />
        )}
        
        {activeTab === 'whiteboard' && roomSettings.allowWhiteboard && (
          <InteractiveWhiteboard
            socket={socket}
            roomId={roomId}
            currentUser={user}
          />
        )}
      </div>

      {/* Participants Sidebar (for desktop) */}
      {!isFullscreen && (
        <div className="participants-sidebar">
          <div className="sidebar-header">
            <h3>
              <Users size={16} />
              Participants ({onlineUsers.length})
            </h3>
          </div>
          
          <div className="participants-list">
            {(onlineUsers || []).map((participant, index) => {
              // Safety check to prevent object rendering
              if (!participant || typeof participant !== 'object') {
                console.warn('Invalid participant data:', participant);
                return null;
              }
              
              const userEmail = participant?.userEmail || 'Unknown';
              const userId = participant?.userId || `unknown-${index}`;
              
              return (
                <div key={userId} className="participant-item">
                  <div className="participant-avatar">
                    {userEmail?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="participant-info">
                    <span className="participant-name">
                      {userEmail === user?.email ? 'You' : userEmail}
                    </span>
                    <span className="participant-status">
                      <div className="status-dot connected"></div>
                      Online
                    </span>
                  </div>
                </div>
              );
            })}
            
            {onlineUsers.length === 0 && (
              <div className="no-participants">
                <Users size={32} />
                <p>No participants yet</p>
                <span>Share the room link to invite others</span>
              </div>
            )}
          </div>
          
          <div className="sidebar-footer">
            <div className="room-info-card">
              <h4>Room Info</h4>
              <p><strong>Created:</strong> {new Date(room.createdAt).toLocaleDateString()}</p>
              <p><strong>Subject:</strong> {room.subject}</p>
              {room.description && (
                <p><strong>Description:</strong> {room.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connection Status Indicator */}
      {!connected && (
        <div className="connection-overlay">
          <div className="connection-status">
            <LoadingSpinner />
            <span>Connecting to study room...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyRoomDetail;