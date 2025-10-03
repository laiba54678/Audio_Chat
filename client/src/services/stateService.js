import { EventEmitter } from 'events';

class StateService extends EventEmitter {
  constructor() {
    super();
    this.state = {
      // User state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      
      // Room state
      rooms: [],
      currentRoom: null,
      participants: [],
      
      // UI state
      notifications: [],
      modals: {
        createRoom: false,
        editProfile: false,
        roomLobby: false
      },
      
      // Connection state
      socketConnected: false,
      audioEnabled: false,
      isMuted: false,
      
      // Error state
      errors: [],
      
      // Cache state
      lastFetch: {
        rooms: null,
        user: null
      }
    };
    
    this.setMaxListeners(50); // Prevent memory leaks
  }

  // Get current state
  getState() {
    return { ...this.state };
  }

  // Get specific state slice
  getStateSlice(key) {
    return this.state[key];
  }

  // Update state and emit change
  setState(updates, silent = false) {
    const oldState = { ...this.state };
    
    // Deep merge for nested objects
    Object.keys(updates).forEach(key => {
      if (typeof updates[key] === 'object' && updates[key] !== null && !Array.isArray(updates[key])) {
        this.state[key] = { ...this.state[key], ...updates[key] };
      } else {
        this.state[key] = updates[key];
      }
    });

    if (!silent) {
      this.emit('stateChange', this.state, oldState);
      
      // Emit specific change events
      Object.keys(updates).forEach(key => {
        this.emit(`${key}Changed`, this.state[key], oldState[key]);
      });
    }
  }

  // Subscribe to state changes
  subscribe(callback) {
    this.on('stateChange', callback);
    return () => this.off('stateChange', callback);
  }

  // Subscribe to specific state slice changes
  subscribeTo(key, callback) {
    this.on(`${key}Changed`, callback);
    return () => this.off(`${key}Changed`, callback);
  }

  // User state management
  setUser(user) {
    this.setState({ 
      user, 
      isAuthenticated: !!user,
      lastFetch: { ...this.state.lastFetch, user: Date.now() }
    });
  }

  clearUser() {
    this.setState({ 
      user: null, 
      isAuthenticated: false,
      currentRoom: null,
      participants: [],
      audioEnabled: false,
      isMuted: false
    });
  }

  // Room state management
  setRooms(rooms) {
    this.setState({ 
      rooms,
      lastFetch: { ...this.state.lastFetch, rooms: Date.now() }
    });
  }

  addRoom(room) {
    const rooms = [...this.state.rooms, room];
    this.setState({ rooms });
  }

  updateRoom(roomId, updates) {
    const rooms = this.state.rooms.map(room => 
      room._id === roomId ? { ...room, ...updates } : room
    );
    this.setState({ rooms });
  }

  removeRoom(roomId) {
    const rooms = this.state.rooms.filter(room => room._id !== roomId);
    this.setState({ rooms });
  }

  setCurrentRoom(room) {
    this.setState({ currentRoom: room });
  }

  setParticipants(participants) {
    this.setState({ participants });
  }

  addParticipant(participant) {
    const participants = [...this.state.participants, participant];
    this.setState({ participants });
  }

  removeParticipant(socketId) {
    const participants = this.state.participants.filter(p => p.socketId !== socketId);
    this.setState({ participants });
  }

  // UI state management
  setLoading(loading) {
    this.setState({ isLoading: loading });
  }

  addNotification(notification) {
    const notifications = [...this.state.notifications, {
      id: Date.now(),
      timestamp: new Date(),
      ...notification
    }];
    this.setState({ notifications });
  }

  removeNotification(id) {
    const notifications = this.state.notifications.filter(n => n.id !== id);
    this.setState({ notifications });
  }

  clearNotifications() {
    this.setState({ notifications: [] });
  }

  setModal(modalName, isOpen) {
    this.setState({
      modals: { ...this.state.modals, [modalName]: isOpen }
    });
  }

  // Connection state management
  setSocketConnected(connected) {
    this.setState({ socketConnected: connected });
  }

  setAudioEnabled(enabled) {
    this.setState({ audioEnabled: enabled });
  }

  setMuted(muted) {
    this.setState({ isMuted: muted });
  }

  // Error state management
  addError(error) {
    const errors = [...this.state.errors, {
      id: Date.now(),
      timestamp: new Date(),
      ...error
    }];
    this.setState({ errors });
  }

  removeError(id) {
    const errors = this.state.errors.filter(e => e.id !== id);
    this.setState({ errors });
  }

  clearErrors() {
    this.setState({ errors: [] });
  }

  // Utility methods
  reset() {
    this.state = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      rooms: [],
      currentRoom: null,
      participants: [],
      notifications: [],
      modals: {
        createRoom: false,
        editProfile: false,
        roomLobby: false
      },
      socketConnected: false,
      audioEnabled: false,
      isMuted: false,
      errors: [],
      lastFetch: {
        rooms: null,
        user: null
      }
    };
    this.emit('stateChange', this.state, {});
  }

  // Persist state to localStorage
  persist(key = 'appState') {
    try {
      const stateToPersist = {
        user: this.state.user,
        isAuthenticated: this.state.isAuthenticated,
        lastFetch: this.state.lastFetch
      };
      localStorage.setItem(key, JSON.stringify(stateToPersist));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  // Restore state from localStorage
  restore(key = 'appState') {
    try {
      const persisted = localStorage.getItem(key);
      if (persisted) {
        const state = JSON.parse(persisted);
        this.setState(state, true); // Silent update
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
  }
}

export default new StateService();
