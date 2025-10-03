import React, { useState, useEffect } from 'react';
import { FaUsers, FaClock, FaLock, FaUnlock, FaArrowLeft, FaCopy } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';
import { roomAPI } from '../services/api';

const RoomLobby = ({ room, onBack, onJoinRoom }) => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (room && user) {
      setIsCreator(user.id === room.creator._id || user._id === room.creator._id);
      setParticipants(room.participants || []);
    }
  }, [room, user]);

  const handleJoinRoom = async () => {
    setLoading(true);
    try {
      await onJoinRoom(room);
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('Failed to join room: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const copyAccessCode = async () => {
    try {
      await navigator.clipboard.writeText(room.accessCode);
      alert('Access code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy access code:', err);
      alert('Failed to copy access code');
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (!room) return null;

  return (
    <div className="lobby-container-dark">
      <div className="lobby-header-dark">
        <button className="lobby-back-btn-dark" onClick={onBack}>
          <FaArrowLeft /> Back to Rooms
        </button>
        <h2 className="lobby-title-dark">Room Lobby</h2>
      </div>

      <div className="lobby-content-dark">
        {/* Room Info Card */}
        <div className="lobby-room-card-dark">
          <div className="lobby-room-header-dark">
            <h3 className="lobby-room-name-dark">{room.name}</h3>
            <div className={`lobby-room-status-dark ${room.status === 'Live' ? 'live' : 'inactive'}`}>
              <span className="lobby-status-text-dark">{room.status}</span>
            </div>
          </div>

          <div className="lobby-room-details-dark">
            <div className="lobby-detail-row-dark">
              <span className="lobby-detail-label-dark">Created by:</span>
              <span className="lobby-detail-value-dark">{room.creator?.username}</span>
            </div>
            <div className="lobby-detail-row-dark">
              <span className="lobby-detail-label-dark">Created:</span>
              <span className="lobby-detail-value-dark">{formatDate(room.createdAt)}</span>
            </div>
            <div className="lobby-detail-row-dark">
              <span className="lobby-detail-label-dark">Type:</span>
              <div className="lobby-room-type-dark">
                {room.type === 'Private' ? (
                  <>
                    <FaLock className="lobby-type-icon-dark" />
                    <span>Private Room</span>
                  </>
                ) : (
                  <>
                    <FaUnlock className="lobby-type-icon-dark" />
                    <span>Public Room</span>
                  </>
                )}
              </div>
            </div>
            <div className="lobby-detail-row-dark">
              <span className="lobby-detail-label-dark">Participants:</span>
              <span className="lobby-detail-value-dark">{participants.length}/{room.maxParticipants}</span>
            </div>
          </div>

          {/* Access Code Display */}
          {room.type === 'Private' && room.accessCode && (
            <div className="lobby-access-code-dark">
              <div className="lobby-access-code-header-dark">
                <FaLock className="lobby-access-icon-dark" />
                <span className="lobby-access-label-dark">Access Code</span>
              </div>
              <div className="lobby-access-code-display-dark">
                <span className="lobby-access-code-value-dark">{room.accessCode}</span>
                <button 
                  className="lobby-access-copy-btn-dark"
                  onClick={copyAccessCode}
                  title="Copy access code"
                >
                  <FaCopy />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Participants List */}
        <div className="lobby-participants-dark">
          <h4 className="lobby-participants-title-dark">
            <FaUsers className="lobby-participants-icon-dark" />
            Participants ({participants.length})
          </h4>
          <div className="lobby-participants-list-dark">
            {participants.length > 0 ? (
              participants.map((participant, index) => (
                <div key={index} className="lobby-participant-item-dark">
                  <div className="lobby-participant-avatar-dark">
                    <span>{participant.user?.username?.charAt(0).toUpperCase() || '?'}</span>
                  </div>
                  <div className="lobby-participant-info-dark">
                    <span className="lobby-participant-name-dark">
                      {participant.user?.username || 'Unknown'}
                    </span>
                    <span className="lobby-participant-status-dark">
                      {participant.socketId ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="lobby-no-participants-dark">
                <span>No participants yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Join Room Section */}
        <div className="lobby-join-section-dark">
          {room.status === 'Inactive' ? (
            <div className="lobby-waiting-dark">
              <div className="lobby-waiting-icon-dark">⏳</div>
              <h4 className="lobby-waiting-title-dark">Room is Inactive</h4>
              <p className="lobby-waiting-message-dark">
                This room is currently inactive. The creator needs to make it live before you can join.
              </p>
              {isCreator && (
                <button 
                  className="lobby-make-live-btn-dark"
                  onClick={() => {
                    // This will be handled by parent component
                    alert('Make room live functionality will be implemented');
                  }}
                >
                  🚀 Make Room Live
                </button>
              )}
            </div>
          ) : (
            <div className="lobby-ready-dark">
              <div className="lobby-ready-icon-dark">✅</div>
              <h4 className="lobby-ready-title-dark">Room is Live!</h4>
              <p className="lobby-ready-message-dark">
                This room is active and ready for audio chat.
              </p>
              <button 
                className="lobby-join-btn-dark"
                onClick={handleJoinRoom}
                disabled={loading}
              >
                {loading ? 'Joining...' : '🎤 Join Audio Chat'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomLobby;
