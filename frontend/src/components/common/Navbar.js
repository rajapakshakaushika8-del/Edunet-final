import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Home, Users, FileText, Clock, BarChart2, LogOut, Menu, X, Search, Bell } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { notifications } = useSocket();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/dashboard" className="nav-logo">
          <div className="logo-icon">
            <BookOpen size={28} />
          </div>
          <span className="logo-text">
            <span className="logo-main">EduNet</span>
            <span className="logo-sub">Sri Lanka</span>
          </span>
        </Link>

        {user && (
          <div className="nav-search">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search study rooms, resources..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && navigate('/study-rooms')}
            />
          </div>
        )}

        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                <Home size={18} />
                <span>Dashboard</span>
              </Link>
              <Link to="/study-rooms" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                <Users size={18} />
                <span>Study Rooms</span>
              </Link>
              <Link to="/resources" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                <FileText size={18} />
                <span>Resources</span>
              </Link>
              <Link to="/study-schedule" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                <Clock size={18} />
                <span>Study Schedule</span>
              </Link>
              <Link to="/activity-report" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                <BarChart2 size={18} />
                <span>Activity Report</span>
              </Link>
              
              <div className="nav-actions">
                <button className="nav-notification-btn" title="Notifications">
                  <Bell size={20} />
                  {notifications.length > 0 && (
                    <span className="notification-badge">{notifications.length}</span>
                  )}
                </button>
              </div>

              <div className="nav-user">
                <div className="user-avatar">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <span className="user-role">Student</span>
                </div>
                <button onClick={handleLogout} className="btn-logout">
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                Login
              </Link>
              <Link to="/register" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                Register
              </Link>
            </>
          )}
        </div>

        <button className="nav-toggle" onClick={toggleMenu}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;