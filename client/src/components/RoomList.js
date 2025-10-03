import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import RoomCard from './RoomCard';
import RoomLobby from './RoomLobby';
import { FaPlus, FaFilter, FaSync } from 'react-icons/fa';

const RoomList = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLobby, setShowLobby] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [filter, setFilter] = useState({ type: '', status: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  
  const [newRoom, setNewRoom] = useState({
    name: '',
    type: 'Public',
    maxParticipants: 10,
  });

  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch rooms
  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await roomAPI.getRooms(filter);
      if (response.success) {
        setRooms(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [filter]);

  // Create room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const response = await roomAPI.createRoom(newRoom);
      if (response.success) {
        setShowCreateModal(false);
        
        // If it's a private room, show the access code
        if (response.data.type === 'Private' && response.data.accessCode) {
          alert(`Private room created! Access Code: ${response.data.accessCode}\n\nShare this code with others to let them join your room.`);
        }
        
        setNewRoom({ name: '', type: 'Public', maxParticipants: 10 });
        fetchRooms();
        navigate(`/room/${response.data._id}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create room');
    }
  };

  // Join room
  const handleJoinRoom = (room) => {
    // Check if room is Inactive or Private - send to lobby
    if (room.status === 'Inactive' || room.type === 'Private') {
      setSelectedRoom(room);
      setShowLobby(true);
    } else {
      // Room is Live and Public - join directly
      joinRoom(room._id);
    }
  };

  const joinRoom = async (roomId, code = null) => {
    try {
      const response = await roomAPI.joinRoom(roomId, code);
      if (response.success) {
        setShowJoinModal(false);
        setAccessCode('');
        navigate(`/room/${roomId}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join room');
    }
  };

  // Show lobby if selected
  if (showLobby && selectedRoom) {
    return (
      <RoomLobby 
        room={selectedRoom}
        onBack={() => {
          setShowLobby(false);
          setSelectedRoom(null);
        }}
        onJoinRoom={async (room) => {
          if (room.type === 'Private') {
            // For private rooms, we need access code
            setShowJoinModal(true);
            setShowLobby(false);
          } else {
            // For public rooms, join directly
            await joinRoom(room._id);
            setShowLobby(false);
            setSelectedRoom(null);
          }
        }}
      />
    );
  }

  return (
    <div className="rooms-container">
      <div className="rooms-header">
        <div className="rooms-title-section">
          <h1>Audio Rooms</h1>
          <p>Join or create a room to start chatting</p>
        </div>
        <div className="rooms-actions">
          <button className="btn-secondary" onClick={fetchRooms}>
            <FaSync /> Refresh
          </button>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <FaPlus /> Create Room
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rooms-filters">
        <div className="filter-group">
          <label className="filter-label">Room Type</label>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filter.type === '' ? 'active' : ''}`}
              onClick={() => setFilter({ ...filter, type: '' })}
            >
              All
            </button>
            <button 
              className={`filter-btn ${filter.type === 'Public' ? 'active' : ''}`}
              onClick={() => setFilter({ ...filter, type: 'Public' })}
            >
              Public
            </button>
            <button 
              className={`filter-btn ${filter.type === 'Private' ? 'active' : ''}`}
              onClick={() => setFilter({ ...filter, type: 'Private' })}
            >
              Private
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Status</label>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filter.status === '' ? 'active' : ''}`}
              onClick={() => setFilter({ ...filter, status: '' })}
            >
              All
            </button>
            <button 
              className={`filter-btn ${filter.status === 'Live' ? 'active' : ''}`}
              onClick={() => setFilter({ ...filter, status: 'Live' })}
            >
              Live
            </button>
            <button 
              className={`filter-btn ${filter.status === 'Inactive' ? 'active' : ''}`}
              onClick={() => setFilter({ ...filter, status: 'Inactive' })}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading rooms...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchRooms}>
            Try Again
          </button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="no-rooms">
          <div className="empty-icon">🎙️</div>
          <h3>No rooms available</h3>
          <p>Be the first to create a room and start chatting!</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <FaPlus /> Create Your First Room
          </button>
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room) => (
            <RoomCard key={room._id} room={room} onJoin={handleJoinRoom} />
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal create-room-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            <h2>Create New Room</h2>
            <p>Set up your audio room and invite others to join</p>
            
            <form onSubmit={handleCreateRoom}>
              <div className="form-group">
                <label>Room Name</label>
                <input
                  type="text"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  required
                  placeholder="Enter room name"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Room Type</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="roomType"
                      value="Public"
                      checked={newRoom.type === 'Public'}
                      onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
                    />
                    <div className="radio-content">
                      <span className="radio-title">Public - Anyone can join</span>
                      <span className="radio-desc">Open to everyone</span>
                    </div>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="roomType"
                      value="Private"
                      checked={newRoom.type === 'Private'}
                      onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
                    />
                    <div className="radio-content">
                      <span className="radio-title">Private - Requires access code</span>
                      <span className="radio-desc">Only invited members</span>
                    </div>
                  </label>
                </div>
                
                {newRoom.type === 'Private' && (
                  <div className="access-code-preview">
                    <div className="access-code-info">
                      <span className="access-code-label">Access code will be generated:</span>
                      <span className="access-code-example">ABC123</span>
                    </div>
                    <p className="access-code-note">
                      Share this code with people you want to invite to your room.
                    </p>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Max Participants</label>
                <input
                  type="number"
                  value={newRoom.maxParticipants}
                  onChange={(e) => setNewRoom({ ...newRoom, maxParticipants: parseInt(e.target.value) || 2 })}
                  min="2"
                  max="50"
                />
                <span className="input-hint">Maximum: 50 participants</span>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Private Room Modal */}
      {showJoinModal && selectedRoom && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowJoinModal(false)}>×</button>
            <h2>Join Private Room</h2>
            <p>Enter the access code to join <strong>{selectedRoom.name}</strong></p>
            
            <form onSubmit={(e) => { e.preventDefault(); joinRoom(selectedRoom._id, accessCode); }}>
              <div className="form-group">
                <label>Access Code</label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  required
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="code-input"
                  autoFocus
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowJoinModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Join Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomList;