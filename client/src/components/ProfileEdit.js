import React, { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaEdit, FaSave, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';

const ProfileEdit = ({ onClose }) => {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile form state
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || user?.username || '',
    email: user?.email || '',
    bio: user?.bio || ''
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.displayName || user.username || '',
        email: user.email || '',
        bio: user.bio || ''
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSave = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await authAPI.updateProfile(profileData);
      
      if (response.success) {
        setUser(response.data);
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
      } else {
        setError(response.message || 'Failed to update profile');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSave = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setError('New password must be at least 6 characters long');
        return;
      }

      const response = await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (response.success) {
        setSuccess('Password changed successfully!');
        setIsChangingPassword(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setError(response.message || 'Failed to change password');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="profile-edit-overlay-dark">
      <div className="profile-edit-modal-dark">
        <div className="profile-edit-header-dark">
          <h2 className="profile-edit-title-dark">Profile Settings</h2>
          <button className="profile-edit-close-dark" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="profile-edit-content-dark">
          {/* Error/Success Messages */}
          {error && (
            <div className="profile-error-dark">
              {error}
            </div>
          )}
          {success && (
            <div className="profile-success-dark">
              {success}
            </div>
          )}

          {/* Profile Information */}
          <div className="profile-section-dark">
            <div className="profile-section-header-dark">
              <h3 className="profile-section-title-dark">Profile Information</h3>
              {!isEditing && (
                <button 
                  className="profile-edit-btn-dark"
                  onClick={() => setIsEditing(true)}
                >
                  <FaEdit /> Edit Profile
                </button>
              )}
            </div>

            <div className="profile-fields-dark">
              <div className="profile-field-dark">
                <label className="profile-label-dark">Username</label>
                <div className="profile-field-readonly-dark">
                  <FaUser className="profile-field-icon-dark" />
                  <span>{user?.username}</span>
                </div>
              </div>

              <div className="profile-field-dark">
                <label className="profile-label-dark">Display Name</label>
                {isEditing ? (
                  <div className="profile-field-input-dark">
                    <FaUser className="profile-field-icon-dark" />
                    <input
                      type="text"
                      name="displayName"
                      value={profileData.displayName}
                      onChange={handleProfileChange}
                      placeholder="Enter display name"
                      maxLength={50}
                    />
                  </div>
                ) : (
                  <div className="profile-field-readonly-dark">
                    <FaUser className="profile-field-icon-dark" />
                    <span>{profileData.displayName || 'Not set'}</span>
                  </div>
                )}
              </div>

              <div className="profile-field-dark">
                <label className="profile-label-dark">Email</label>
                {isEditing ? (
                  <div className="profile-field-input-dark">
                    <FaEnvelope className="profile-field-icon-dark" />
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      placeholder="Enter email address"
                    />
                  </div>
                ) : (
                  <div className="profile-field-readonly-dark">
                    <FaEnvelope className="profile-field-icon-dark" />
                    <span>{profileData.email || 'Not set'}</span>
                  </div>
                )}
              </div>

              <div className="profile-field-dark">
                <label className="profile-label-dark">Bio</label>
                {isEditing ? (
                  <div className="profile-field-textarea-dark">
                    <textarea
                      name="bio"
                      value={profileData.bio}
                      onChange={handleProfileChange}
                      placeholder="Tell us about yourself..."
                      maxLength={200}
                      rows={3}
                    />
                    <div className="profile-field-counter-dark">
                      {profileData.bio.length}/200
                    </div>
                  </div>
                ) : (
                  <div className="profile-field-readonly-dark">
                    <span>{profileData.bio || 'No bio provided'}</span>
                  </div>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="profile-actions-dark">
                <button 
                  className="profile-save-btn-dark"
                  onClick={handleProfileSave}
                  disabled={loading}
                >
                  <FaSave /> {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  className="profile-cancel-btn-dark"
                  onClick={() => {
                    setIsEditing(false);
                    setError('');
                    setSuccess('');
                    // Reset form data
                    setProfileData({
                      displayName: user?.displayName || user?.username || '',
                      email: user?.email || '',
                      bio: user?.bio || ''
                    });
                  }}
                >
                  <FaTimes /> Cancel
                </button>
              </div>
            )}
          </div>

          {/* Password Section */}
          <div className="profile-section-dark">
            <div className="profile-section-header-dark">
              <h3 className="profile-section-title-dark">Security</h3>
              {!isChangingPassword && (
                <button 
                  className="profile-edit-btn-dark"
                  onClick={() => setIsChangingPassword(true)}
                >
                  <FaEdit /> Change Password
                </button>
              )}
            </div>

            {isChangingPassword && (
              <div className="profile-fields-dark">
                <div className="profile-field-dark">
                  <label className="profile-label-dark">Current Password</label>
                  <div className="profile-field-input-dark">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter current password"
                    />
                    <button 
                      type="button"
                      className="profile-password-toggle-dark"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div className="profile-field-dark">
                  <label className="profile-label-dark">New Password</label>
                  <div className="profile-field-input-dark">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password"
                    />
                    <button 
                      type="button"
                      className="profile-password-toggle-dark"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div className="profile-field-dark">
                  <label className="profile-label-dark">Confirm New Password</label>
                  <div className="profile-field-input-dark">
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <div className="profile-actions-dark">
                  <button 
                    className="profile-save-btn-dark"
                    onClick={handlePasswordSave}
                    disabled={loading}
                  >
                    <FaSave /> {loading ? 'Changing...' : 'Change Password'}
                  </button>
                  <button 
                    className="profile-cancel-btn-dark"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setError('');
                      setSuccess('');
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                    }}
                  >
                    <FaTimes /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Account Information */}
          <div className="profile-section-dark">
            <h3 className="profile-section-title-dark">Account Information</h3>
            <div className="profile-fields-dark">
              <div className="profile-field-dark">
                <label className="profile-label-dark">Member Since</label>
                <div className="profile-field-readonly-dark">
                  <span>{formatDate(user?.createdAt)}</span>
                </div>
              </div>
              <div className="profile-field-dark">
                <label className="profile-label-dark">Last Updated</label>
                <div className="profile-field-readonly-dark">
                  <span>{formatDate(user?.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileEdit;
