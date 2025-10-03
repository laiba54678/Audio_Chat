
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';

class SocketService {
  constructor() {
    this.socket = null;
    this.peerConnections = new Map();
    this.localStream = null;
    this.eventListeners = new Map();
  }

  // Connect to socket
  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.setupSocketListeners();
    return this.socket;
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.cleanupPeerConnections();
  }

  // Setup default socket listeners
  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.emit('socket-connected', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.emit('socket-disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.emit('socket-error', error);
    });

    this.socket.on('error', (data) => {
      console.error('Socket error:', data);
      this.emit('error', data);
    });
  }

  // Join a room
  joinRoom(roomId) {
    if (this.socket) {
      this.socket.emit('join-room', { roomId });
    }
  }

  // Leave a room
  leaveRoom(roomId) {
    if (this.socket) {
      this.socket.emit('leave-room', { roomId });
    }
  }

  // Send chat message
  sendMessage(roomId, message) {
    if (this.socket) {
      this.socket.emit('chat-message', { roomId, message });
    }
  }

  // Typing indicators
  startTyping(roomId) {
    if (this.socket) {
      this.socket.emit('typing-start', { roomId });
    }
  }

  stopTyping(roomId) {
    if (this.socket) {
      this.socket.emit('typing-stop', { roomId });
    }
  }

  // WebRTC - Get user media
  async getUserMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      return this.localStream;
    } catch (error) {
      console.error('Error getting user media:', error);
      throw error;
    }
  }

  // WebRTC - Create peer connection
  createPeerConnection(targetSocketId, isInitiator = false) {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(config);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('Received remote track from', targetSocketId);
      this.emit('remote-stream', {
        socketId: targetSocketId,
        stream: event.streams[0],
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc-ice-candidate', {
          candidate: event.candidate,
          targetSocketId,
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Peer connection state (${targetSocketId}):`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.closePeerConnection(targetSocketId);
      }
    };

    this.peerConnections.set(targetSocketId, pc);
    return pc;
  }

  // WebRTC - Create and send offer
  async createOffer(roomId, targetSocketId) {
    try {
      const pc = this.createPeerConnection(targetSocketId, true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.socket.emit('webrtc-offer', {
        roomId,
        offer,
        targetSocketId,
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  // WebRTC - Handle received offer
  async handleOffer(roomId, offer, senderSocketId) {
    try {
      const pc = this.createPeerConnection(senderSocketId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.socket.emit('webrtc-answer', {
        roomId,
        answer,
        targetSocketId: senderSocketId,
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  // WebRTC - Handle received answer
  async handleAnswer(answer, senderSocketId) {
    try {
      const pc = this.peerConnections.get(senderSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  // WebRTC - Handle ICE candidate
  async handleIceCandidate(candidate, senderSocketId) {
    try {
      const pc = this.peerConnections.get(senderSocketId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  // Close peer connection
  closePeerConnection(socketId) {
    const pc = this.peerConnections.get(socketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(socketId);
      this.emit('peer-disconnected', socketId);
    }
  }

  // Cleanup all peer connections
  cleanupPeerConnections() {
    this.peerConnections.forEach((pc, socketId) => {
      pc.close();
    });
    this.peerConnections.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }

  // Mute/Unmute audio
  toggleAudio(mute) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !mute;
      });
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);

    // Also listen on socket if connected
    if (this.socket && !['socket-connected', 'socket-disconnected', 'socket-error', 'remote-stream', 'peer-disconnected'].includes(event)) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach((callback) => {
        callback(data);
      });
    }
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }

  // Check if connected
  isConnected() {
    return this.socket?.connected || false;
  }
}

const socketService = new SocketService();
export default socketService;