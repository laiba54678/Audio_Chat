import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Temporarily disable strict security checks for existing accounts
    // const rateLimitKey = `${config.method}_${config.url}`;
    // const rateLimit = securityService.checkRateLimit(rateLimitKey, 10, 60000);
    
    // if (!rateLimit.allowed) {
    //   return Promise.reject(new Error('Rate limit exceeded. Please try again later.'));
    // }
    
    // // Security validation
    // if (config.data) {
    //   const suspicious = securityService.detectSuspiciousActivity(JSON.stringify(config.data));
    //   if (suspicious.isSuspicious) {
    //     return Promise.reject(new Error('Suspicious activity detected'));
    //   }
    // }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: async (username, password, email) => {
    try {
      const response = await api.post('/auth/register', { username, password, email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  login: async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getMe: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await api.put('/auth/password', passwordData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Room API calls
export const roomAPI = {
  createRoom: async (roomData) => {
    const response = await api.post('/rooms', roomData);
    return response.data;
  },

  getRooms: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/rooms?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getRoom: async (roomId) => {
    try {
      const response = await api.get(`/rooms/${roomId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  joinRoom: async (roomId, accessCode = null) => {
    try {
      const response = await api.post(`/rooms/${roomId}/join`, { accessCode });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateRoomStatus: async (roomId, status) => {
    try {
      const response = await api.put(`/rooms/${roomId}/status`, { status });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  leaveRoom: async (roomId) => {
    try {
      const response = await api.delete(`/rooms/${roomId}/leave`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteRoom: async (roomId) => {
    try {
      const response = await api.delete(`/rooms/${roomId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default api;