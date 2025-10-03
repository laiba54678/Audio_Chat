import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import RoomList from './components/RoomList';
import ChatRoom from './components/ChatRoom';
import UserProfile from './components/UserProfile';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationSystem from './components/NotificationSystem';
import { FaUser, FaHome, FaMicrophone } from 'react-icons/fa';
import './styles/App.css';

// ========== LOGIN PAGE ==========
const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, error, clearError } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearError();

    const result = isRegister 
      ? await register(username, password, email)
      : await login(username, password);

    setLoading(false);

    if (!result.success) {
      alert(result.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <FaMicrophone />
          </div>
          <h1>{isRegister ? 'Create Account' : 'Welcome Back'}</h1>
          <p>{isRegister ? 'Join the conversation today' : 'Sign in to continue to your audio rooms'}</p>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              placeholder="Enter username"
            />
          </div>
          
          {isRegister && (
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={isRegister}
                placeholder="Enter email"
              />
            </div>
          )}
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Enter password"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        
        <div className="login-footer">
          <button 
            onClick={() => {
              setIsRegister(!isRegister);
              setUsername('');
              setPassword('');
              setEmail('');
              clearError();
            }}
            className="link-button"
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ========== PROTECTED ROUTE ==========
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// ========== LAYOUT WITH NAVBAR ==========
const Layout = ({ children }) => {
  const { user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-content">
            <Link to="/rooms" className="nav-brand">
              <FaMicrophone />
              <span>AudioChat</span>
            </Link>
            
            <div className="nav-links">
              <Link to="/rooms" className="nav-link active">
                <FaHome />
                <span>Rooms</span>
              </Link>
              
              <button 
                onClick={() => setShowProfile(!showProfile)}
                className="nav-link"
              >
                <FaUser />
                <span>{user?.username}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Profile Modal */}
      {showProfile && (
        <div 
          className="modal-overlay"
          onClick={() => setShowProfile(false)}
        >
          <div 
            className="profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Your Profile</h2>
              <button 
                onClick={() => setShowProfile(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <UserProfile />
          </div>
        </div>
      )}
    </div>
  );
};

// ========== MAIN APP ==========
function App() {
  return (
    <ErrorBoundary name="App">
      <AuthProvider>
        <Router>
          <AppRoutes />
          <NotificationSystem />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

// ========== ROUTES ==========
const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Login Route */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/rooms" /> : <Login />} 
      />
      
      {/* Rooms List Route */}
      <Route
        path="/rooms"
        element={
          <ProtectedRoute>
            <Layout>
              <RoomList />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      {/* Chat Room Route */}
      <Route
        path="/room/:roomId"
        element={
          <ProtectedRoute>
            <Layout>
              <ChatRoom />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      {/* Default Routes */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
};

export default App;