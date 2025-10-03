import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FaUser, FaSignOutAlt, FaEdit } from 'react-icons/fa';
import ProfileEdit from './ProfileEdit';

const UserProfile = () => {
  const { user, logout } = useAuth();
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  if (!user) return null;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <div className="profile-container-dark">
        <div className="profile-card-dark">
          <div className="profile-avatar-dark">
            <FaUser />
          </div>
          <div className="profile-info-dark">
            <h3 className="profile-name-dark">{user.displayName || user.username}</h3>
            {user.email && (
              <p className="profile-email-dark">{user.email}</p>
            )}
            {user.bio && (
              <p className="profile-bio-dark">"{user.bio}"</p>
            )}
            <p className="profile-joined-dark">Joined {formatDate(user.createdAt)}</p>
          </div>
        </div>
        
        <div className="profile-actions-dark">
          <h4 className="profile-actions-title-dark">Account Actions</h4>
          <div className="profile-buttons-dark">
            <button 
              className="btn-edit-profile-dark" 
              onClick={() => setShowProfileEdit(true)}
            >
              <FaEdit /> Edit Profile
            </button>
            <button className="btn-logout-dark" onClick={logout}>
              <FaSignOutAlt /> Log Out
            </button>
          </div>
        </div>
      </div>

      {showProfileEdit && (
        <ProfileEdit onClose={() => setShowProfileEdit(false)} />
      )}
    </>
  );
};

export default UserProfile;