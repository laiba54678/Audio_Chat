
/**
 * WebRTC Service
 * Handles peer-to-peer audio connections using WebRTC
 * This service provides helper functions for WebRTC signaling
 */

// ICE server configuration for STUN/TURN
const ICE_SERVERS = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'
    },
    {
      urls: 'stun:stun1.l.google.com:19302'
    }
  ]
};

/**
 * Get ICE server configuration
 * @returns {Object} ICE server configuration
 */
const getIceServers = () => {
  return ICE_SERVERS;
};

/**
 * Validate WebRTC offer/answer
 * @param {Object} sessionDescription - SDP session description
 * @returns {Boolean} Whether the session description is valid
 */
const validateSessionDescription = (sessionDescription) => {
  if (!sessionDescription) return false;
  if (!sessionDescription.type || !sessionDescription.sdp) return false;
  if (!['offer', 'answer'].includes(sessionDescription.type)) return false;
  return true;
};

/**
 * Validate ICE candidate
 * @param {Object} candidate - ICE candidate
 * @returns {Boolean} Whether the candidate is valid
 */
const validateIceCandidate = (candidate) => {
  if (!candidate) return false;
  if (!candidate.candidate || !candidate.sdpMid || candidate.sdpMLineIndex === undefined) {
    return false;
  }
  return true;
};

/**
 * Create peer connection configuration
 * @returns {Object} Peer connection configuration
 */
const createPeerConnectionConfig = () => {
  return {
    ...ICE_SERVERS,
    iceCandidatePoolSize: 10,
  };
};

/**
 * Handle WebRTC peer connection state
 * @param {RTCPeerConnection} pc - Peer connection
 * @param {Function} onStateChange - Callback for state changes
 */
const setupPeerConnectionListeners = (pc, onStateChange) => {
  pc.oniceconnectionstatechange = () => {
    console.log('ICE connection state:', pc.iceConnectionState);
    if (onStateChange) {
      onStateChange('iceConnectionState', pc.iceConnectionState);
    }
  };

  pc.onconnectionstatechange = () => {
    console.log('Connection state:', pc.connectionState);
    if (onStateChange) {
      onStateChange('connectionState', pc.connectionState);
    }
  };

  pc.onsignalingstatechange = () => {
    console.log('Signaling state:', pc.signalingState);
    if (onStateChange) {
      onStateChange('signalingState', pc.signalingState);
    }
  };
};

module.exports = {
  getIceServers,
  validateSessionDescription,
  validateIceCandidate,
  createPeerConnectionConfig,
  setupPeerConnectionListeners,
  ICE_SERVERS
};