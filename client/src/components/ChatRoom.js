import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import socketService from '../services/socketService';
import { 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaSignOutAlt, 
  FaPaperPlane, 
  FaUsers,
  FaCircle,
  FaArrowLeft
} from 'react-icons/fa';

const ChatRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  console.log('ChatRoom - Current user:', user);
  const { 
    joinRoom, 
    leaveRoom, 
    sendMessage, 
    startTyping, 
    stopTyping, 
    getUserMedia, 
    createOffer, 
    toggleAudio 
  } = useWebSocket();

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isMuted, setIsMuted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomStatusDebounce, setRoomStatusDebounce] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioRefs = useRef(new Map());

  // Fetch room details
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await roomAPI.getRoom(roomId);
        if (response.success) {
          setRoom(response.data);
          setParticipants(response.data.participants || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load room');
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  // Join room via WebSocket
  useEffect(() => {
    if (room) {
      joinRoom(roomId);
    }

    return () => {
      if (room) {
        leaveRoom(roomId);
        socketService.cleanupPeerConnections();
      }
    };
  }, [room, roomId, joinRoom, leaveRoom]);

  // Setup WebSocket listeners
  useEffect(() => {
    socketService.on('room-joined', (data) => {
      console.log('Room joined:', data);
      // Convert server format to frontend format
      const formattedParticipants = (data.participants || []).map(p => ({
        user: { _id: p.userId, username: p.username },
        socketId: p.socketId,
        isMuted: false
      }));
      setParticipants(formattedParticipants);
    });

    socketService.on('user-joined', (data) => {
      console.log('User joined:', data);
      setParticipants(prev => [
        ...prev, 
        { user: { _id: data.userId, username: data.username }, socketId: data.socketId, isMuted: false }
      ]);
      
      if (audioEnabled && room?.status === 'Live') {
        setTimeout(() => {
          createOffer(roomId, data.socketId);
        }, 1000);
      }
    });

    socketService.on('user-left', (data) => {
      setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.delete(data.socketId);
        return newStreams;
      });
    });

    socketService.on('chat-message', (data) => {
      console.log('Received chat message:', data);
      setMessages(prev => [...prev, data]);
    });

    socketService.on('user-typing', (data) => {
      setTypingUsers(prev => new Set(prev).add(data.username));
    });

    socketService.on('user-stopped-typing', (data) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.username);
        return newSet;
      });
    });

    socketService.on('room-status-updated', (data) => {
      if (room && data.status !== room.status) {
        console.log('Room status updated:', data.status);
        
        // Clear existing timeout
        if (roomStatusDebounce) {
          clearTimeout(roomStatusDebounce);
        }
        
        // Set new timeout to update status after 500ms
        const timeout = setTimeout(() => {
          setRoom(prevRoom => ({ ...prevRoom, status: data.status }));
          setRoomStatusDebounce(null);
        }, 500);
        
        setRoomStatusDebounce(timeout);
      }
    });

    socketService.on('remote-stream', (data) => {
      console.log('Received remote stream:', data);
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.set(data.socketId, data.stream);
        return newStreams;
      });
    });

    // WebRTC Events
    socketService.on('webrtc-offer', async (data) => {
      console.log('Received WebRTC offer:', data);
      await socketService.handleOffer(roomId, data.offer, data.senderSocketId);
    });

    socketService.on('webrtc-answer', async (data) => {
      console.log('Received WebRTC answer:', data);
      await socketService.handleAnswer(data.answer, data.senderSocketId);
    });

    socketService.on('webrtc-ice-candidate', async (data) => {
      console.log('Received ICE candidate:', data);
      await socketService.handleIceCandidate(data.candidate, data.senderSocketId);
    });

    socketService.on('peer-disconnected', (socketId) => {
      console.log('Peer disconnected:', socketId);
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(socketId);
        return newMap;
      });
    });

    return () => {
      // Clear any pending room status updates
      if (roomStatusDebounce) {
        clearTimeout(roomStatusDebounce);
      }
      
      socketService.off('room-joined');
      socketService.off('user-joined');
      socketService.off('user-left');
      socketService.off('user-disconnected');
      socketService.off('chat-message');
      socketService.off('user-typing');
      socketService.off('user-stopped-typing');
      socketService.off('room-status-updated');
      socketService.off('remote-stream');
      socketService.off('webrtc-offer');
      socketService.off('webrtc-answer');
      socketService.off('webrtc-ice-candidate');
      socketService.off('peer-disconnected');
    };
  }, [roomId, audioEnabled, room, createOffer]);

  // Play remote audio streams
  useEffect(() => {
    remoteStreams.forEach((stream, socketId) => {
      if (!audioRefs.current.has(socketId)) {
        const audio = new Audio();
        audio.srcObject = stream;
        audio.autoplay = true;
        audioRefs.current.set(socketId, audio);
        audio.play().catch(e => console.error('Error playing audio:', e));
      }
    });

    audioRefs.current.forEach((audio, socketId) => {
      if (!remoteStreams.has(socketId)) {
        audio.pause();
        audio.srcObject = null;
        audioRefs.current.delete(socketId);
      }
    });
  }, [remoteStreams]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      console.log('Sending message:', message, 'to room:', roomId);
      sendMessage(roomId, message);
      setMessage('');
      stopTyping(roomId);
    }
  };

  // Handle typing
  const handleTyping = (e) => {
    setMessage(e.target.value);
    
    startTyping(roomId);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(roomId);
    }, 1000);
  };

  // Handle toggle mute
  const handleToggleMute = () => {
    toggleAudio();
    setIsMuted(!isMuted);
  };

  // Handle enable audio
  const handleEnableAudio = async () => {
    if (!audioEnabled) {
      const stream = await getUserMedia();
      if (stream) {
        setAudioEnabled(true);
        
        // Set up audio level monitoring
        setupAudioLevelMonitoring(stream);
        
        participants.forEach(p => {
          if (p.socketId !== socketService.socket.id) {
            createOffer(roomId, p.socketId);
          }
        });
      }
    }
  };

  // Set up audio level monitoring for speaking detection
  const setupAudioLevelMonitoring = (stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    analyser.fftSize = 256;
    microphone.connect(analyser);
    
    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const level = average / 255;
      
      setAudioLevel(level);
      
      // Consider speaking if audio level is above threshold
      const speaking = level > 0.01;
      setIsSpeaking(speaking);
      
      if (audioEnabled) {
        requestAnimationFrame(checkAudioLevel);
      }
    };
    
    checkAudioLevel();
  };

  // Handle leave room
  const handleLeaveRoom = () => {
    leaveRoom(roomId);
    navigate('/rooms');
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div>Loading room...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <div>{error}</div>
        <button className="btn btn-primary" onClick={() => navigate('/rooms')}>
          Back to Rooms
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="error">
        <div>Room not found</div>
        <button className="btn btn-primary" onClick={() => navigate('/rooms')}>
          Back to Rooms
        </button>
      </div>
    );
  }

  return (
    <div className="chat-room-dark">
      <div className="room-main-dark">
        {/* Room Header */}
        <div className="room-header-section-dark">
          <div className="room-navigation-dark">
            <button 
              className="back-btn-dark"
              onClick={() => navigate('/rooms')}
              title="Back to Rooms"
            >
              <FaArrowLeft />
              Back to Rooms
            </button>
          </div>
          <div className="room-title-row-dark">
            <div className="room-title-dark">
              <h2 className="room-name-dark">{room.name}</h2>
              <p className="room-creator-dark">Created by {room.creator?.username}</p>
            </div>
            <div className={`room-status-badge-dark ${room.status === 'Live' ? 'live' : 'inactive'}`}>
              <FaCircle className="status-icon-dark" />
              {room.status}
            </div>
          </div>
        </div>

        {/* Media Area */}
        <div className="media-area-dark">
          {audioEnabled ? (
            <div className="audio-visualization-dark">
              <div className="audio-waves-dark">
                <div 
                  className={`wave-dark ${isSpeaking ? 'speaking' : ''}`}
                  style={{ height: `${Math.max(20, audioLevel * 100)}%` }}
                ></div>
                <div 
                  className={`wave-dark ${isSpeaking ? 'speaking' : ''}`}
                  style={{ height: `${Math.max(20, audioLevel * 80)}%` }}
                ></div>
                <div 
                  className={`wave-dark ${isSpeaking ? 'speaking' : ''}`}
                  style={{ height: `${Math.max(20, audioLevel * 120)}%` }}
                ></div>
                <div 
                  className={`wave-dark ${isSpeaking ? 'speaking' : ''}`}
                  style={{ height: `${Math.max(20, audioLevel * 60)}%` }}
                ></div>
                <div 
                  className={`wave-dark ${isSpeaking ? 'speaking' : ''}`}
                  style={{ height: `${Math.max(20, audioLevel * 90)}%` }}
                ></div>
              </div>
              <div className="audio-status-info-dark">
                <p className={`audio-status-dark ${isSpeaking ? 'speaking' : ''}`}>
                  {isSpeaking ? '🎤 Speaking...' : '🔇 Listening'}
                </p>
                <p className="audio-level-dark">
                  Level: {Math.round(audioLevel * 100)}%
                </p>
                {isMuted && (
                  <p className="muted-status-dark">🔇 Muted</p>
                )}
              </div>
            </div>
          ) : (
            <div className="audio-placeholder-dark">
              <FaMicrophone size={48} />
              <p className="placeholder-text-dark">Click "Enable Audio" to start talking</p>
            </div>
          )}
        </div>

        {/* Audio Controls */}
        <div className="audio-controls-section-dark">
          {!audioEnabled && (
            <button 
              className="btn-primary-dark"
              onClick={handleEnableAudio}
            >
              <FaMicrophone /> Enable Audio
            </button>
          )}
          
          {audioEnabled && (
            <>
              <button 
                className={`audio-control-btn-dark mute ${isMuted ? 'active' : ''}`}
                onClick={handleToggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
              </button>
              
              <button 
                className="audio-control-btn-dark leave"
                onClick={handleLeaveRoom}
                title="Leave Room"
              >
                <FaSignOutAlt />
              </button>
            </>
          )}
          
          {!audioEnabled && (
            <button 
              className="btn-secondary-dark"
              onClick={handleLeaveRoom}
            >
              <FaSignOutAlt /> Leave Room
            </button>
          )}
        </div>

        {/* Chat Section */}
        <div className="chat-section-dark">
          <h3 className="chat-header-dark">Chat</h3>
          
          <div className="chat-messages-dark">
            {messages.map((msg, index) => (
              <div key={index} className="chat-message-dark">
                <div className="message-author-dark">
                  {msg.username}
                  <span className="message-time-dark">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="message-content-dark">{msg.message}</div>
              </div>
            ))}
            {typingUsers.size > 0 && (
              <div className="typing-indicator-dark">
                {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-container-dark">
            <input
              type="text"
              value={message}
              onChange={handleTyping}
              placeholder="Type a message..."
              className="message-input-dark"
            />
            <button type="submit" disabled={!message.trim()} className="send-btn-dark">
              <FaPaperPlane />
            </button>
          </form>
        </div>
      </div>

      {/* Participants Panel */}
      <div className="participants-panel-dark">
        <div className="participants-header-dark">
          <FaUsers />
          <h3>Participants ({participants.length})</h3>
        </div>
        
        <div className="participants-list-dark">
          {participants.map((participant, index) => {
            const isCurrentUser = participant.user?._id === user?._id || participant.user?._id === user?.id;
            const participantIsSpeaking = isCurrentUser ? isSpeaking : false; // For now, only show current user speaking
            
            return (
              <div key={index} className={`participant-item-dark ${participantIsSpeaking ? 'speaking' : ''}`}>
                <div className="participant-info-dark">
                  <span className="participant-name-dark">
                    {participant.user?.username || 'Unknown'}
                    {isCurrentUser && ' (You)'}
                  </span>
                  <div className="participant-status-indicators-dark">
                    {participantIsSpeaking && (
                      <span className="speaking-indicator-dark">🎤 Speaking</span>
                    )}
                    <span className={`participant-status-dark ${participant.isMuted ? 'muted' : 'active'}`}>
                      {participant.isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;