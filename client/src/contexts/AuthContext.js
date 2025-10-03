
import React, { createContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import socketService from '../services/socketService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      // Always start with loading false to show login page first
      setLoading(false);
      
      // Don't auto-login users - they must explicitly login
      // This ensures the login page is always shown first
    };

    loadUser();
  }, []);

  // Register user
  const register = async (username, password, email) => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('Registering user:', { username, password, email });
      const response = await authAPI.register(username, password, email);
      console.log('Register response:', response);
      
      if (response.success) {
        const { token: newToken, ...userData } = response.data;
        
        setToken(newToken);
        setUser(userData);
        
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Connect socket
        socketService.connect(newToken);
        
        return { success: true };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (username, password) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await authAPI.login(username, password);
      
      if (response.success) {
        const { token: newToken, ...userData } = response.data;
        
        setToken(newToken);
        setUser(userData);
        
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Connect socket
        socketService.connect(newToken);
        
        return { success: true };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Login failed';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    setUser(null);
    setToken(null);
    setError(null);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Disconnect socket
    socketService.disconnect();
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    token,
    loading,
    error,
    register,
    login,
    logout,
    clearError,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};