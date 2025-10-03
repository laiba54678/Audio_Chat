
import { useEffect, useRef, useCallback } from 'react';
import socketService from '../services/socketService';

export const useWebSocket = () => {
  const listenersRef = useRef([]);

  // Subscribe to socket events
  const on = useCallback((event, callback) => {
    socketService.on(event, callback);
    listenersRef.current.push({ event, callback });
  }, []);

  // Unsubscribe from socket events
  const off = useCallback((event, callback) => {
    socketService.off(event, callback);
    listenersRef.current = listenersRef.current.filter(
      (listener) => listener.event !== event || listener.callback !== callback
    );
  }, []);

  // Emit socket events
  const emit = useCallback((event, data) => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit(event, data);
    }
  }, []);

  // Join room
  const joinRoom = useCallback((roomId) => {
    socketService.joinRoom(roomId);
  }, []);

  // Leave room
  const leaveRoom = useCallback((roomId) => {
    socketService.leaveRoom(roomId);
  }, []);

  // Send message
  const sendMessage = useCallback((roomId, message) => {
    socketService.sendMessage(roomId, message);
  }, []);

  // Typing indicators
  const startTyping = useCallback((roomId) => {
    socketService.startTyping(roomId);
  }, []);

  const stopTyping = useCallback((roomId) => {
    socketService.stopTyping(roomId);
  }, []);

  // WebRTC functions
  const getUserMedia = useCallback(async () => {
    return await socketService.getUserMedia();
  }, []);

  const createOffer = useCallback((roomId, targetSocketId) => {
    socketService.createOffer(roomId, targetSocketId);
  }, []);

  const toggleAudio = useCallback((mute) => {
    socketService.toggleAudio(mute);
  }, []);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      listenersRef.current.forEach(({ event, callback }) => {
        socketService.off(event, callback);
      });
      listenersRef.current = [];
    };
  }, []);

  return {
    on,
    off,
    emit,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    getUserMedia,
    createOffer,
    toggleAudio,
    isConnected: socketService.isConnected(),
  };
};