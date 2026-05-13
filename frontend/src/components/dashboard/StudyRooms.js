import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, BookOpen, Clock, Search, Filter, Edit, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import './StudyRooms.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const StudyRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userSubjects, setUserSubjects] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [newRoom, setNewRoom] = useState({
    name: '',
    course: '',
    description: '',
    maxMembers: 10
  });
  const [editRoom, setEditRoom] = useState({
    name: '',
    course: '',
    description: '',
    maxMembers: 10
  });
  const { user } = useAuth();

  // Fetch study rooms and user subjects
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        // Fetch study rooms
        const roomsResponse = await fetch(`${API_BASE_URL}/study-rooms`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!roomsResponse.ok) {
          throw new Error('Failed to fetch study rooms');
        }

        const roomsData = await roomsResponse.json();
        setRooms(Array.isArray(roomsData) ? roomsData : roomsData.studyRooms || []);

        // Fetch user subjects
        try {
          const subjectsResponse = await userAPI.getUserSubjects();
          setUserSubjects(subjectsResponse.data || []);
        } catch (subjectError) {
          console.error('Error fetching subjects:', subjectError);
          setUserSubjects([]);
        }

        setError(null);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Create new study room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/study-rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newRoom)
      });

      if (!response.ok) {
        throw new Error('Failed to create study room');
      }

      const responseData = await response.json();
      const createdRoom = responseData.studyRoom || responseData;
      setRooms(prev => [createdRoom, ...prev]);
      setShowCreateModal(false);
      setNewRoom({ name: '', course: '', description: '', maxMembers: 10 });
    } catch (error) {
      console.error('Error creating study room:', error);
      setError('Failed to create study room. Please try again.');
    }
  };

  // Edit study room
  const handleEditRoom = (room) => {
    setSelectedRoom(room);
    setEditRoom({
      name: room.name,
      course: room.course,
      description: room.description,
      maxMembers: room.maxMembers
    });
    setShowEditModal(true);
  };

  const handleUpdateRoom = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/study-rooms/${selectedRoom._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editRoom)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update study room');
      }

      const responseData = await response.json();
      const updatedRoom = responseData.studyRoom || responseData;

      setRooms(prev => prev.map(room =>
        room._id === selectedRoom._id ? updatedRoom : room
      ));

      setShowEditModal(false);
      setSelectedRoom(null);
      setEditRoom({ name: '', course: '', description: '', maxMembers: 10 });
      setError(null);
    } catch (error) {
      console.error('Error updating study room:', error);
      setError(error.message || 'Failed to update study room. Please try again.');
    }
  };

  // Delete study room
  const handleDeleteRoom = (room) => {
    setSelectedRoom(room);
    setShowDeleteModal(true);
  };

  const confirmDeleteRoom = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/study-rooms/${selectedRoom._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete study room');
      }

      setRooms(prev => prev.filter(room => room._id !== selectedRoom._id));

      setShowDeleteModal(false);
      setSelectedRoom(null);
      setError(null);
    } catch (error) {
      console.error('Error deleting study room:', error);
      setError(error.message || 'Failed to delete study room. Please try again.');
    }
  };

  // Filter rooms based on search and subject
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (room.course && room.course.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSubject = filterSubject === 'All' || room.course === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="study-rooms-loading">
        <LoadingSpinner />
        <p>Loading study rooms...</p>
      </div>
    );
  }

  return (
    <div className="study-rooms-container">
      {/* Header */}
      <div className="study-rooms-header">
        <div className="header-content">
          <div className="header-info">
            <h1>Study Rooms</h1>
            <p>Join collaborative learning spaces with your peers</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="create-room-btn"
          >
            <Plus size={20} />
            Create Room
          </button>
        </div>

        {/* Search and Filter */}
        <div className="rooms-controls">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-box">
            <Filter size={18} />
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="All">All Subjects</option>
              {userSubjects.map(subject => (
                <option key={subject._id} value={subject.name}>{subject.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {/* Rooms Grid */}
      <div className="rooms-grid">
        {filteredRooms.length === 0 ? (
          <div className="no-rooms">
            <Users size={48} />
            <h3>No Study Rooms Found</h3>
            <p>
              {searchTerm || filterSubject !== 'All'
                ? 'Try adjusting your search or filter criteria.'
                : 'Be the first to create a study room and start collaborating!'
              }
            </p>
            {!searchTerm && filterSubject === 'All' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="create-first-room-btn"
              >
                <Plus size={18} />
                Create Your First Room
              </button>
            )}
          </div>
        ) : (
          filteredRooms.map(room => (
            <div key={room._id} className="room-card">
              <div className="room-header">
                <div className="room-subject">
                  <BookOpen size={16} />
                  {room.course || 'No Subject'}
                </div>
                <div className="room-participants">
                  <Users size={16} />
                  {room.members?.length || 0}/{room.maxMembers || 20}
                </div>
              </div>

              <div className="room-content">
                <h3>{room.name}</h3>
                {room.description && (
                  <p className="room-description">{room.description}</p>
                )}

                <div className="room-meta">
                  <span className="room-creator">
                    Created by {room.createdBy?.name || 'Unknown'}
                  </span>
                  <span className="room-date">
                    <Clock size={14} />
                    {formatDate(room.createdAt)}
                  </span>
                </div>
              </div>

              <div className="room-actions">
                <Link
                  to={`/room/${room._id}`}
                  className="join-room-btn"
                >
                  Join Room
                </Link>

                {/* Show edit/delete only for room creator */}
                {user && room.createdBy && (room.createdBy._id === user.id || room.createdBy === user.id) && (
                  <div className="room-admin-actions">
                    <button
                      onClick={() => handleEditRoom(room)}
                      className="icon-btn edit-btn"
                      title="Edit Room"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room)}
                      className="icon-btn delete-btn"
                      title="Delete Room"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create Study Room</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="create-room-form">
              <div className="form-group">
                <label htmlFor="roomName">Room Name</label>
                <input
                  type="text"
                  id="roomName"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="Enter room name..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="roomSubject">Subject</label>
                <select
                  id="roomSubject"
                  value={newRoom.course}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, course: e.target.value }))}
                  required
                >
                  <option value="">Select a subject</option>
                  {userSubjects.length > 0 ? (
                    userSubjects.map(subject => (
                      <option key={subject._id} value={subject.name}>{subject.name}</option>
                    ))
                  ) : (
                    <option value="" disabled>No subjects available - Add subjects from Dashboard</option>
                  )}
                </select>
                {userSubjects.length === 0 && (
                  <p className="help-text">
                    <Link to="/dashboard">Manage your subjects</Link> to create study rooms
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="roomDescription">Description (Optional)</label>
                <textarea
                  id="roomDescription"
                  value={newRoom.description}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what you'll be studying..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxMembers">Max Participants</label>
                <input
                  type="number"
                  id="maxMembers"
                  value={newRoom.maxMembers}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, maxMembers: parseInt(e.target.value) }))}
                  min="2"
                  max="50"
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {showEditModal && selectedRoom && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Study Room</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRoom(null);
                  setEditRoom({ name: '', course: '', description: '', maxMembers: 10 });
                }}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateRoom} className="create-room-form">
              <div className="form-group">
                <label htmlFor="editRoomName">Room Name</label>
                <input
                  type="text"
                  id="editRoomName"
                  value={editRoom.name}
                  onChange={(e) => setEditRoom(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="Enter room name..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="editRoomSubject">Subject</label>
                <select
                  id="editRoomSubject"
                  value={editRoom.course}
                  onChange={(e) => setEditRoom(prev => ({ ...prev, course: e.target.value }))}
                  required
                >
                  <option value="">Select a subject</option>
                  {userSubjects.length > 0 ? (
                    userSubjects.map(subject => (
                      <option key={subject._id} value={subject.name}>{subject.name}</option>
                    ))
                  ) : (
                    <option value="" disabled>No subjects available</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="editRoomDescription">Description (Optional)</label>
                <textarea
                  id="editRoomDescription"
                  rows="4"
                  value={editRoom.description}
                  onChange={(e) => setEditRoom(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what you'll be studying..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="editMaxMembers">Maximum Members</label>
                <input
                  type="number"
                  id="editMaxMembers"
                  min="2"
                  max="50"
                  value={editRoom.maxMembers}
                  onChange={(e) => setEditRoom(prev => ({ ...prev, maxMembers: parseInt(e.target.value) || 10 }))}
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRoom(null);
                    setEditRoom({ name: '', course: '', description: '', maxMembers: 10 });
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Update Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Room Confirmation Modal */}
      {showDeleteModal && selectedRoom && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <h2>Delete Study Room</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRoom(null);
                }}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="delete-confirmation">
              <p>Are you sure you want to delete the study room <strong>"{selectedRoom.name}"</strong>?</p>
              <p className="warning-text">This action cannot be undone. All room data, messages, and resources will be permanently deleted.</p>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedRoom(null);
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteRoom}
                  className="delete-btn"
                >
                  <Trash2 size={16} />
                  Delete Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyRooms;