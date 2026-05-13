import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Calendar, Clock, BookOpen, AlertCircle, Play, Square, X } from 'lucide-react';
import { studySessionAPI } from '../../services/api';
import './StudySchedule.css';

const StudySchedule = () => {
  const [sessions, setSessions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalHours: 0,
    todaysSessions: 0,
    upcomingSessions: 0
  });
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    date: '',
    startTime: '',
    endTime: '',
    notes: ''
  });

  // Load sessions from API on mount
  useEffect(() => {
    loadSessions();
    loadStats();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await studySessionAPI.getAll();
      setSessions(response.data.data || []);
      setError('');
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await studySessionAPI.getStats();
      setStats(response.data.data);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  // Timer effect for active session
  useEffect(() => {
    let interval;
    if (timerActive && activeSessionId) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, activeSessionId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStartSessionTimer = (sessionId) => {
    if (activeSessionId === sessionId && timerActive) {
      // Stop the timer if clicking the same session
      setTimerActive(false);
    } else {
      // Start timer for this session
      setActiveSessionId(sessionId);
      setTimerActive(true);
      setElapsedSeconds(0);
    }
  };

  const handleEndSessionTimer = async (sessionId) => {
    if (activeSessionId === sessionId && timerActive) {
      setTimerActive(false);
      
      // Save elapsed time to database
      if (elapsedSeconds > 0) {
        try {
          setLoading(true);
          await studySessionAPI.update(sessionId, {
            timerSeconds: elapsedSeconds,
            isActive: false
          });
          
          // Reload sessions and stats to reflect updated timer value
          await loadSessions();
          await loadStats();
        } catch (err) {
          console.error('Error saving timer:', err);
          // Still close the timer even if save fails
        } finally {
          setLoading(false);
        }
      }
      
      setElapsedSeconds(0);
      setActiveSessionId(null);
    }
  };

  const validateForm = () => {
    if (!formData.subject || !formData.date) {
      return false;
    }
    
    if (formData.startTime && formData.endTime) {
      const start = new Date(`${formData.date}T${formData.startTime}`);
      const end = new Date(`${formData.date}T${formData.endTime}`);
      return start < end;
    }
    
    return true;
  };

  const handleAddSession = async () => {
    if (!validateForm()) {
      alert('Please fill all required fields and ensure end time is after start time');
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        // Update existing session
        await studySessionAPI.update(editingId, formData);
        setEditingId(null);
      } else {
        // Create new session
        await studySessionAPI.create(formData);
      }

      // Reset form and reload data
      setFormData({
        subject: '',
        topic: '',
        date: '',
        startTime: '',
        endTime: '',
        notes: ''
      });
      setShowForm(false);
      setTimerActive(false);
      setElapsedSeconds(0);
      
      // Reload sessions and stats
      await loadSessions();
      await loadStats();
    } catch (err) {
      console.error('Error saving session:', err);
      alert('Error saving session: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEditSession = (session) => {
    // Map database session to form data
    setFormData({
      subject: session.subject || '',
      topic: session.topic || '',
      date: session.date || '',
      startTime: session.startTime || '',
      endTime: session.endTime || '',
      notes: session.notes || ''
    });
    setEditingId(session._id); // Use MongoDB _id instead of id
    setShowForm(true);
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      setLoading(true);
      await studySessionAPI.delete(id);
      
      // Reload sessions and stats
      await loadSessions();
      await loadStats();
    } catch (err) {
      console.error('Error deleting session:', err);
      alert('Error deleting session: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    const durationMin = endTotalMin - startTotalMin;
    
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getDateOnly = (dateStr) => {
    if (!dateStr) return'';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };

  const isSessionUpcoming = (date) => {
    const now = new Date();
    const sessionDate = new Date(date);
    return sessionDate >= now;
  };

  const upcomingSessions = sessions
    .filter(session => isSessionUpcoming(session.date))
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });

  const totalStudyHours = sessions.reduce((total, session) => {
    if (session.startTime && session.endTime) {
      try {
        const [startHour, startMin] = session.startTime.split(':').map(Number);
        const [endHour, endMin] = session.endTime.split(':').map(Number);
        const durationMin = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        return total + Math.max(0, durationMin / 60);
      } catch (e) {
        return total;
      }
    }
    return total;
  }, 0);

  const getTodaysSessions = () => {
    const today = new Date().toISOString().split('T')[0];
    return sessions.filter(session => {
      const sessionDate = getDateOnly(session.date);
      return sessionDate === today;
    });
  };

  const todaysSessions = getTodaysSessions();

  return (
    <div className="study-schedule">
      <div className="schedule-header">
        <div className="header-left">
          <h2>Study Schedule</h2>
          <p>Plan and track your study sessions</p>
        </div>
        <button 
          className="btn btn-primary add-session-btn"
          onClick={() => {
            setEditingId(null);
            setFormData({
              subject: '',
              topic: '',
              date: '',
              startTime: '',
              endTime: '',
              notes: ''
            });
            setTimerActive(false);
            setElapsedSeconds(0);
            setShowForm(!showForm);
          }}
        >
          <Plus size={20} />
          {showForm ? 'Cancel' : 'Add Session'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="schedule-stats">
        <div className="stat-card">
          <div className="stat-icon total-sessions">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Sessions</span>
            <span className="stat-value">{stats?.totalSessions ?? sessions.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon study-hours">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Study Hours</span>
            <span className="stat-value">{(stats?.totalHours ?? totalStudyHours).toFixed(1)}h</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon upcoming">
            <BookOpen size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Upcoming</span>
            <span className="stat-value">{stats?.upcomingSessions ?? upcomingSessions.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon today">
            <AlertCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Today's Sessions</span>
            <span className="stat-value">{stats?.todaysSessions ?? todaysSessions.length}</span>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="schedule-form-container">
          <div className="schedule-form">
            <h3>{editingId ? 'Edit Session' : 'Create New Study Session'}</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="date">Date *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject/Course *</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  placeholder="e.g., Mathematics, Physics"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="topic">Topic</label>
                <input
                  type="text"
                  id="topic"
                  name="topic"
                  placeholder="e.g., Calculus Chapter 5"
                  value={formData.topic}
                  onChange={handleInputChange}
                  className="form-control"
                />
              </div>

              {/* Timer Section */}
              {/* Removed - users can click on session cards to start timer */}

              <div className="form-group full-width">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  placeholder="Add any additional notes about this session..."
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="form-control"
                  rows="3"
                />
              </div>
            </div>

            <div className="form-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    subject: '',
                    topic: '',
                    date: '',
                    startTime: '',
                    endTime: '',
                    notes: ''
                  });
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleAddSession}
              >
                {editingId ? 'Update Session' : 'Create Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="alert alert-info">Loading sessions...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Sessions List */}
      <div className="sessions-container">
        {upcomingSessions.length > 0 ? (
          <>
            <h3 className="sessions-title">Upcoming Sessions</h3>
            <div className="sessions-list">
              {upcomingSessions.map(session => (
                <div key={session._id} className={`session-card ${activeSessionId === session._id ? 'active' : ''}`}>
                  <div className="session-left">
                    <div className="session-date">
                      <Calendar size={20} />
                      <span>{formatDate(session.date)}</span>
                    </div>
                    <div className="session-subject">
                      <h4>{session.subject}</h4>
                      {session.topic && <p className="session-topic">{session.topic}</p>}
                    </div>
                  </div>

                  <div className="session-middle">
                    {activeSessionId === session._id ? (
                      <div className="session-timer">
                        <h4>Timer</h4>
                        <div className="timer-display-value">
                          {formatTime(elapsedSeconds)}
                        </div>
                        <div className="timer-controls">
                          <button
                            className={`btn btn-success btn-sm ${timerActive ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartSessionTimer(session._id);
                            }}
                            disabled={timerActive}
                          >
                            <Play size={14} />
                            Start
                          </button>
                          <button
                            className={`btn btn-danger btn-sm ${!timerActive && elapsedSeconds > 0 ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEndSessionTimer(session._id);
                            }}
                            disabled={!timerActive && elapsedSeconds === 0}
                          >
                            <Square size={14} />
                            End
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {session.startTime && session.endTime ? (
                          <>
                            <div className="session-time">
                              <Clock size={18} />
                              <span>{session.startTime} - {session.endTime}</span>
                            </div>
                            <div className="session-duration">
                              {calculateDuration(session.startTime, session.endTime)}
                            </div>
                          </>
                        ) : (
                          <div className="session-time empty">
                            <Clock size={18} />
                            <span>No specific time set</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="session-notes">
                    {session.notes && !activeSessionId === session._id && (
                      <p className="notes-text">{session.notes}</p>
                    )}
                  </div>

                  <div className="session-actions">
                    {activeSessionId !== session._id && (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setActiveSessionId(session._id)}
                          title="Start session timer"
                        >
                          <Play size={14} />
                          Start Timer
                        </button>
                        <button
                          className="btn-icon edit-btn"
                          onClick={() => handleEditSession(session)}
                          title="Edit session"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className="btn-icon delete-btn"
                          onClick={() => handleDeleteSession(session._id)}
                          title="Delete session"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                    {activeSessionId === session._id && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setActiveSessionId(null);
                          setTimerActive(false);
                          setElapsedSeconds(0);
                        }}
                      >
                        <X size={14} />
                        Close Timer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <Calendar size={48} />
            <h3>No upcoming sessions</h3>
            <p>Create your first study session to get started</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
            >
              <Plus size={18} /> Create Session
            </button>
          </div>
        )}
      </div>

      {/* All Sessions */}
      {sessions.length > 0 && (
        <div className="sessions-container all-sessions">
          <h3 className="sessions-title">All Sessions</h3>
          <div className="sessions-grid">
            {sessions.map(session => (
              <div key={session._id} className="session-summary-card">
                <div className="card-header">
                  <h4>{session.subject}</h4>
                  <span className="session-date">{formatDate(session.date)}</span>
                </div>
                
                <div className="card-body">
                  {session.topic && (
                    <div className="card-row">
                      <label>Topic:</label>
                      <span>{session.topic}</span>
                    </div>
                  )}
                  
                  {session.startTime && session.endTime ? (
                    <div className="card-row">
                      <label>Time:</label>
                      <span>{session.startTime} - {session.endTime}</span>
                    </div>
                  ) : null}
                  
                  {session.duration && session.duration > 0 ? (
                    <div className="card-row">
                      <label>Duration:</label>
                      <span>{Math.floor(session.duration / 60)}h {session.duration % 60}m</span>
                    </div>
                  ) : null}
                  
                  {session.timerSeconds && session.timerSeconds > 0 ? (
                    <div className="card-row">
                      <label>Time Tracked:</label>
                      <span>{formatTime(session.timerSeconds)}</span>
                    </div>
                  ) : null}
                  
                  {session.notes && (
                    <div className="card-row">
                      <label>Notes:</label>
                      <span className="notes-preview">{session.notes}</span>
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleEditSession(session)}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteSession(session._id)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudySchedule;
