import React from 'react';
import { FaLock, FaUnlock, FaUsers, FaCircle, FaClock, FaCopy, FaTrash } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';
import { roomAPI } from '../services/api';

const RoomCard = ({ room, onJoin }) => {
  const { user } = useAuth();
  const isLive = room.status === 'Live';
  const participantCount = room.participants?.length || 0;
  const isFull = participantCount >= room.maxParticipants;
  const capacityPercentage = (participantCount / room.maxParticipants) * 100;
  const isCreator = user && room.creator && (user.id === room.creator._id || user._id === room.creator._id);
  
  // Debug logging
  console.log('RoomCard Debug:', {
    userId: user?.id,
    creatorId: room.creator?._id,
    isCreator,
    roomName: room.name,
    accessCode: room.accessCode
  });

  // Copy access code to clipboard
  const copyAccessCode = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(room.accessCode);
      alert('Access code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy access code:', err);
      alert('Failed to copy access code');
    }
  };

  // Make room live
  const handleMakeLive = async (e) => {
    e.stopPropagation();
    try {
      await roomAPI.updateRoomStatus(room._id, 'Live');
      alert('Room is now Live!');
      // Refresh the page to update the room list
      window.location.reload();
    } catch (err) {
      console.error('Failed to make room live:', err);
      alert('Failed to make room live: ' + (err.response?.data?.message || err.message));
    }
  };

  // Delete room
  const handleDeleteRoom = async (e) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Are you sure you want to delete "${room.name}"? This action cannot be undone.`);
    if (confirmed) {
      try {
        await roomAPI.deleteRoom(room._id);
        alert('Room deleted successfully!');
        // Refresh the page to update the room list
        window.location.reload();
      } catch (err) {
        console.error('Failed to delete room:', err);
        alert('Failed to delete room: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  // Format created date
  const formatDate = (date) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className={`room-card-dark ${isLive ? 'live' : ''}`}>
      {/* Access Code Display - Prominent at top */}
      {room.type === 'Private' && room.accessCode && (
        <div className="room-access-code-banner-dark">
          <div className="access-code-banner-content-dark">
            <FaLock className="access-code-banner-icon-dark" />
            <span className="access-code-banner-label-dark">Access Code:</span>
            <span className="access-code-banner-code-dark">{room.accessCode}</span>
            <button 
              className="access-code-banner-copy-dark"
              onClick={copyAccessCode}
              title="Copy access code"
            >
              <FaCopy />
            </button>
          </div>
        </div>
      )}

      <div className="room-header-dark">
        <div className="room-title-section-dark">
          <h3 className="room-title-dark">{room.name}</h3>
          <div className="room-meta-dark">
            <span className="room-creator-dark">by {room.creator?.username || 'Unknown'}</span>
            {room.createdAt && (
              <>
                <span className="room-separator-dark">•</span>
                <span className="room-time-dark">
                  <FaClock /> {formatDate(room.createdAt)}
                </span>
              </>
            )}
          </div>
        </div>
        <div className={`room-status-dark ${isLive ? 'live' : 'inactive'}`}>
          <FaCircle className="status-icon-dark" />
          <span className="status-text-dark">{isLive ? 'Live' : 'Inactive'}</span>
        </div>
      </div>

      <div className="room-details-dark">
        <div className="detail-row-dark">
          {room.type === 'Private' ? (
            <>
              <FaLock className="detail-icon-dark" />
              <span className="detail-text-dark">Private Room</span>
            </>
          ) : (
            <>
              <FaUnlock className="detail-icon-dark" />
              <span className="detail-text-dark">Public Room</span>
            </>
          )}
        </div>
        
        <div className="detail-row-dark">
          <FaUsers className="detail-icon-dark" />
          <span className="detail-text-dark">{participantCount}/{room.maxParticipants}</span>
          {participantCount > 0 && (
            <div className="participants-preview-dark">
              <span className="participants-names-dark">
                {room.participants?.slice(0, 3).map(p => p.user?.username || 'Unknown').join(', ')}
                {participantCount > 3 && ` +${participantCount - 3} more`}
              </span>
            </div>
          )}
        </div>
      </div>

      {room.type === 'Private' && room.accessCode && (
        <div className="access-code-info-dark">
          <FaLock className="access-icon-dark" />
          {isCreator ? (
            <div className="access-code-creator-dark">
              <span className="access-text-dark">Access Code: </span>
              <span className="access-code-value-dark">{room.accessCode}</span>
              <button 
                className="copy-code-btn-dark"
                onClick={copyAccessCode}
                title="Copy access code"
              >
                <FaCopy />
              </button>
            </div>
          ) : (
            <span className="access-text-dark">Access Code Required</span>
          )}
        </div>
      )}

      <div className="room-actions-dark">
        {isCreator && !isLive && (
          <button 
            className="btn-make-live-dark"
            onClick={handleMakeLive}
            title="Make room live"
          >
            🚀 Make Live
          </button>
        )}
        <button 
          className={`btn-primary-dark ${isFull ? 'disabled' : ''}`}
          onClick={() => onJoin(room)}
          disabled={isFull}
        >
          {isFull ? 'Room Full' : 'Join Room'}
        </button>
        {isCreator && (
          <button 
            className="btn-delete-dark"
            onClick={handleDeleteRoom}
            title="Delete room"
          >
            <FaTrash />
          </button>
        )}
      </div>
    </div>
  );
};

export default RoomCard;