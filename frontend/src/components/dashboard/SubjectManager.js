import React, { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';
import { X, Plus, Trash2, Edit3, BookOpen, Save } from 'lucide-react';
import './SubjectManager.css';

const SubjectManager = ({ onClose, onRefresh }) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', code: '', description: '' });
  const [editingSubject, setEditingSubject] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await userAPI.getUserSubjects();
      setSubjects(response.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    
    if (!newSubject.name.trim()) {
      setErrors({ name: 'Subject name is required' });
      return;
    }

    setSaving(true);
    try {
      const response = await userAPI.addSubject(newSubject);
      setSubjects(prev => [...prev, response.data]);
      setNewSubject({ name: '', code: '', description: '' });
      setShowAddForm(false);
      setErrors({});
      onRefresh();
    } catch (error) {
      console.error('Error adding subject:', error);
      setErrors({ 
        general: error.response?.data?.message || 'Failed to add subject' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSubject = async (subjectId, updatedData) => {
    setSaving(true);
    try {
      const response = await userAPI.updateSubject(subjectId, updatedData);
      setSubjects(prev => prev.map(subject => 
        subject._id === subjectId ? response.data : subject
      ));
      setEditingSubject(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating subject:', error);
      setErrors({ 
        general: error.response?.data?.message || 'Failed to update subject' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject? This will affect your study room data.')) {
      return;
    }

    setSaving(true);
    try {
      await userAPI.deleteSubject(subjectId);
      setSubjects(prev => prev.filter(subject => subject._id !== subjectId));
      onRefresh();
    } catch (error) {
      console.error('Error deleting subject:', error);
      setErrors({ 
        general: error.response?.data?.message || 'Failed to delete subject' 
      });
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (subject) => {
    setEditingSubject({ ...subject });
    setShowAddForm(false);
  };

  const cancelEditing = () => {
    setEditingSubject(null);
    setErrors({});
  };

  const handleEditChange = (field, value) => {
    setEditingSubject(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveEdit = () => {
    if (!editingSubject.name.trim()) {
      setErrors({ name: 'Subject name is required' });
      return;
    }
    handleUpdateSubject(editingSubject._id, {
      name: editingSubject.name,
      code: editingSubject.code,
      description: editingSubject.description
    });
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content subject-manager-modal">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading subjects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content subject-manager-modal">
        <div className="modal-header">
          <h2>
            <BookOpen size={24} />
            Manage Your Subjects
          </h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="subject-manager-content">
          {errors.general && (
            <div className="error-message general-error">
              {errors.general}
            </div>
          )}

          {/* Add Subject Button */}
          {!showAddForm && !editingSubject && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary add-subject-btn"
            >
              <Plus size={18} />
              Add New Subject
            </button>
          )}

          {/* Add Subject Form */}
          {showAddForm && (
            <form onSubmit={handleAddSubject} className="subject-form">
              <h3>Add New Subject</h3>
              <div className="form-group">
                <label>Subject Name *</label>
                <input
                  type="text"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                  className={errors.name ? 'error' : ''}
                  placeholder="e.g., Advanced Mathematics"
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label>Subject Code (Optional)</label>
                <input
                  type="text"
                  value={newSubject.code}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g., MATH301"
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={newSubject.description}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the subject"
                  rows="2"
                />
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddForm(false);
                    setNewSubject({ name: '', code: '', description: '' });
                    setErrors({});
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Adding...' : 'Add Subject'}
                </button>
              </div>
            </form>
          )}

          {/* Subjects List */}
          <div className="subjects-list">
            <h3>Your Subjects ({subjects.length})</h3>
            {subjects.length === 0 ? (
              <div className="empty-state">
                <BookOpen size={48} />
                <h4>No subjects added yet</h4>
                <p>Add your first subject to start organizing your study data</p>
              </div>
            ) : (
              <div className="subjects-grid">
                {subjects.map(subject => (
                  <div key={subject._id} className="subject-card">
                    {editingSubject && editingSubject._id === subject._id ? (
                      // Edit Mode
                      <div className="subject-edit-form">
                        <div className="form-group">
                          <input
                            type="text"
                            value={editingSubject.name}
                            onChange={(e) => handleEditChange('name', e.target.value)}
                            className={errors.name ? 'error' : ''}
                            placeholder="Subject name"
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="text"
                            value={editingSubject.code || ''}
                            onChange={(e) => handleEditChange('code', e.target.value)}
                            placeholder="Subject code"
                          />
                        </div>
                        <div className="form-group">
                          <textarea
                            value={editingSubject.description || ''}
                            onChange={(e) => handleEditChange('description', e.target.value)}
                            placeholder="Description"
                            rows="2"
                          />
                        </div>
                        <div className="subject-actions">
                          <button 
                            onClick={cancelEditing}
                            className="btn btn-secondary btn-sm"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={saveEdit}
                            className="btn btn-primary btn-sm"
                            disabled={saving}
                          >
                            <Save size={14} />
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div className="subject-header">
                          <h4>{subject.name}</h4>
                          {subject.code && <span className="subject-code">{subject.code}</span>}
                        </div>
                        {subject.description && (
                          <p className="subject-description">{subject.description}</p>
                        )}
                        <div className="subject-stats">
                          <span>Study Rooms: {subject.roomCount || 0}</span>
                          <span>Hours: {subject.totalHours || 0}</span>
                        </div>
                        <div className="subject-actions">
                          <button 
                            onClick={() => startEditing(subject)}
                            className="btn btn-outline btn-sm"
                            disabled={saving}
                          >
                            <Edit3 size={14} />
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteSubject(subject._id)}
                            className="btn btn-danger btn-sm"
                            disabled={saving}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectManager;