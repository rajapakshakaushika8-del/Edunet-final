import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import Peer from 'simple-peer';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff,
  Monitor,
  MonitorOff,
  Users,
  Maximize
} from 'lucide-react';
import './VideoConference.css';

const VideoConference = forwardRef(({ socket, roomId, currentUser, participants }, ref) => {
  const [, setLocalStream] = useState(null);
  const [, setPeers] = useState({});
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isInCall, setIsInCall] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [participantStatuses, setParticipantStatuses] = useState({});

  const localVideoRef = useRef();
  const remoteVideoRefs = useRef({});
  const peersRef = useRef({});
  const localStreamRef = useRef();
  const audioContextRef = useRef();
  const analyserRef = useRef();
  const isMountedRef = useRef(true);

  // Initialize media devices
  const initializeMedia = useCallback(async () => {
    const setupAudioLevelMonitoring = (stream) => {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const microphone = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current.smoothingTimeConstant = 0.3;
      analyserRef.current.fftSize = 512;
      
      microphone.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
        }
        
        if (!isMuted && isInCall) {
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (!isMountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      setLocalStream(stream);
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Mute audio by default
      stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });

      // Disable video by default
      stream.getVideoTracks().forEach(track => {
        track.enabled = false;
      });

      // Set up audio level monitoring
      if (stream.getAudioTracks().length > 0) {
        setupAudioLevelMonitoring(stream);
      }

      setConnectionStatus('ready');
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setConnectionStatus('error');
    }
  }, [isMuted, isInCall]);

  const createPeerConnection = useCallback((userId, isInitiator, incomingSignal = null) => {
    const peer = new Peer({
      initiator: isInitiator,
      trickle: false,
      stream: localStreamRef.current
    });

    peer.on('signal', (signal) => {
      socket.emit('send-call-signal', {
        roomId,
        userId,
        signal
      });
    });

    peer.on('stream', (remoteStream) => {
      setRemoteStreams(prev => ({
        ...prev,
        [userId]: remoteStream
      }));
      
      if (remoteVideoRefs.current[userId]) {
        remoteVideoRefs.current[userId].srcObject = remoteStream;
      }
    });

    peer.on('error', (error) => {
      console.error('Peer connection error:', error);
    });

    peer.on('close', () => {
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[userId];
        return newStreams;
      });
    });

    if (incomingSignal) {
      peer.signal(incomingSignal);
    }

    peersRef.current[userId] = peer;
    setPeers(prev => ({ ...prev, [userId]: peer }));
  }, [socket, roomId]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on('user-joined-call', (data) => {
      if (data.userId !== currentUser?.userId) {
        createPeerConnection(data.userId, true);
      }
    });

    socket.on('user-left-call', (data) => {
      if (peersRef.current[data.userId]) {
        peersRef.current[data.userId].destroy();
        delete peersRef.current[data.userId];
        setPeers(prev => {
          const newPeers = { ...prev };
          delete newPeers[data.userId];
          return newPeers;
        });
        setRemoteStreams(prev => {
          const newStreams = { ...prev };
          delete newStreams[data.userId];
          return newStreams;
        });
      }
    });

    socket.on('call-signal', (data) => {
      if (data.userId !== currentUser?.userId) {
        if (peersRef.current[data.userId]) {
          peersRef.current[data.userId].signal(data.signal);
        } else {
          createPeerConnection(data.userId, false, data.signal);
        }
      }
    });

    socket.on('participant-media-status', (data) => {
      setParticipantStatuses(prev => ({
        ...prev,
        [data.userId]: {
          isMuted: data.isMuted,
          videoEnabled: data.videoEnabled
        }
      }));
    });

    return () => {
      socket.off('user-joined-call');
      socket.off('user-left-call');
      socket.off('call-signal');
      socket.off('participant-media-status');
    };
  }, [socket, currentUser?.userId, createPeerConnection]);

  const joinCall = async () => {
    if (!localStreamRef.current) {
      await initializeMedia();
    }

    setIsInCall(true);
    setConnectionStatus('connecting');

    // Broadcast join call event
    socket.emit('join-call', { roomId });
    
    // Enable media based on current settings
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = !isMuted;
    });
    
    localStreamRef.current.getVideoTracks().forEach(track => {
      track.enabled = isVideoEnabled;
    });

    setConnectionStatus('connected');
  };

  const leaveCall = () => {
    // Clean up peer connections
    Object.values(peersRef.current).forEach(peer => {
      peer.destroy();
    });
    peersRef.current = {};
    setPeers({});
    setRemoteStreams({});

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setLocalStream(null);
    localStreamRef.current = null;

    // Stop screen sharing if active
    if (isScreenSharing) {
      stopScreenShare();
    }

    setIsInCall(false);
    setConnectionStatus('disconnected');

    // Broadcast leave call event
    socket.emit('leave-call', { roomId });
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState;
      });
    }

    // Broadcast media status change
    socket.emit('media-status-change', {
      roomId,
      isMuted: newMutedState,
      videoEnabled: isVideoEnabled
    });
  };

  const toggleVideo = () => {
    const newVideoState = !isVideoEnabled;
    setIsVideoEnabled(newVideoState);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = newVideoState;
      });
    }

    // Broadcast media status change
    socket.emit('media-status-change', {
      roomId,
      isMuted,
      videoEnabled: newVideoState
    });
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      Object.values(peersRef.current).forEach(peer => {
        const sender = peer._pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Update local video display
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      setIsScreenSharing(true);

      // Handle screen share end
      videoTrack.onended = () => {
        stopScreenShare();
      };

    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = async () => {
    try {
      // Get camera stream back
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });

      const videoTrack = cameraStream.getVideoTracks()[0];
      videoTrack.enabled = isVideoEnabled;

      // Replace screen share track with camera track
      Object.values(peersRef.current).forEach(peer => {
        const sender = peer._pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Update local video display
      if (localVideoRef.current) {
        const newStream = new MediaStream([
          videoTrack,
          ...localStreamRef.current.getAudioTracks()
        ]);
        localVideoRef.current.srcObject = newStream;
        localStreamRef.current = newStream;
      }

      setIsScreenSharing(false);
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getParticipantName = (userId) => {
    if (userId === currentUser?.userId) return 'You';
    const participant = participants?.find(p => p.userId === userId);
    return participant?.name || `User ${userId.slice(-4)}`;
  };

  // Expose cleanup function to parent component
  useImperativeHandle(ref, () => ({
    cleanup: () => {
      // Stop all media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped media track:', track.kind);
        });
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      
      // Clean up peer connections
      Object.values(peersRef.current).forEach(peer => {
        peer.destroy();
      });
      peersRef.current = {};
      setPeers({});
      setRemoteStreams({});
      
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      // Reset states
      setLocalStream(null);
      localStreamRef.current = null;
      setIsInCall(false);
      setIsVideoEnabled(false);
      setIsMuted(true);
      setIsScreenSharing(false);
      setConnectionStatus('disconnected');
      
      console.log('Video conference cleanup completed');
    }
  }), []);

  // Initialize media on component mount
  useEffect(() => {
    const localVideo = localVideoRef.current;
    const localStream = localStreamRef.current;
    const peers = peersRef.current;
    const audioContext = audioContextRef.current;

    isMountedRef.current = true;
    initializeMedia();
    
    return () => {
      isMountedRef.current = false;
      // Clean up on unmount
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (localVideo) {
        localVideo.srcObject = null;
      }
      Object.values(peers).forEach(peer => peer.destroy());
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [initializeMedia]);

  return (
    <div className={`video-conference ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Control Bar */}
      <div className="video-controls">
        <div className="control-group">
          <div className="connection-status">
            <div className={`status-indicator ${connectionStatus}`}></div>
            <span>{connectionStatus}</span>
          </div>
          
          <div className="participant-count">
            <Users size={16} />
            <span>{Object.keys(remoteStreams).length + (isInCall ? 1 : 0)}</span>
          </div>
        </div>

        <div className="control-group">
          <button
            className={`control-btn ${isMuted ? 'muted' : 'active'}`}
            onClick={toggleMute}
            disabled={!isInCall}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            className={`control-btn ${isVideoEnabled ? 'active' : ''}`}
            onClick={toggleVideo}
            disabled={!isInCall}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <button
            className={`control-btn ${isScreenSharing ? 'active' : ''}`}
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            disabled={!isInCall}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          </button>

          <button
            className="control-btn"
            onClick={toggleFullscreen}
            title="Toggle fullscreen"
          >
            <Maximize size={20} />
          </button>
        </div>

        <div className="control-group">
          {!isInCall ? (
            <button
              className="control-btn join-call"
              onClick={joinCall}
              disabled={connectionStatus === 'error'}
            >
              <Phone size={20} />
              Join Call
            </button>
          ) : (
            <button
              className="control-btn leave-call"
              onClick={leaveCall}
            >
              <PhoneOff size={20} />
              Leave
            </button>
          )}
        </div>
      </div>

      {/* Video Grid */}
      <div className="video-grid">
        {/* Local Video */}
        {isInCall && (
          <div className="video-container local-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="video-element"
            />
            <div className="video-overlay">
              <div className="participant-info">
                <span className="participant-name">You</span>
                <div className="media-status">
                  {isMuted && <MicOff size={12} />}
                  {!isVideoEnabled && <VideoOff size={12} />}
                  {isScreenSharing && <Monitor size={12} />}
                </div>
              </div>
              
              {!isMuted && (
                <div className="audio-level">
                  <div 
                    className="audio-level-bar"
                    style={{ 
                      width: `${Math.min(audioLevel / 50 * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Remote Videos */}
        {Object.entries(remoteStreams).map(([userId, stream]) => (
          <div key={userId} className="video-container remote-video">
            <video
              ref={el => {
                if (el) {
                  remoteVideoRefs.current[userId] = el;
                  el.srcObject = stream;
                }
              }}
              autoPlay
              playsInline
              className="video-element"
            />
            <div className="video-overlay">
              <div className="participant-info">
                <span className="participant-name">
                  {getParticipantName(userId)}
                </span>
                <div className="media-status">
                  {participantStatuses[userId]?.isMuted && <MicOff size={12} />}
                  {!participantStatuses[userId]?.videoEnabled && <VideoOff size={12} />}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {!isInCall && (
          <div className="video-empty-state">
            <Video size={48} />
            <h3>Video Conference</h3>
            <p>Join the call to start video conferencing with other participants</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default VideoConference;