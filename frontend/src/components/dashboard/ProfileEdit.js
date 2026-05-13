import React, { useState } from 'react';
import { userAPI } from '../../services/api';
import { X, Save, User, Mail, GraduationCap, Calendar, Award } from 'lucide-react';
import './ProfileEdit.css';

const ProfileEdit = ({ user, onClose, onUpdate, onRefresh }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    university: user?.university || '',
    faculty: user?.faculty || '',
    year: user?.year || '1',
    gpa: user?.gpa || ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.university.trim()) {
      newErrors.university = 'University is required';
    }

    if (!formData.faculty.trim()) {
      newErrors.faculty = 'Faculty is required';
    }

    if (formData.gpa && (parseFloat(formData.gpa) < 0 || parseFloat(formData.gpa) > 4)) {
      newErrors.gpa = 'GPA must be between 0 and 4';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        ...formData,
        gpa: formData.gpa ? parseFloat(formData.gpa) : null
      };

      const response = await userAPI.updateProfile(updateData);
      
      if (response.data) {
        onUpdate(response.data);
        onRefresh();
        onClose();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors({
        general: error.response?.data?.message || 'Failed to update profile'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content profile-edit-modal">
        <div className="modal-header">
          <h2>Edit Profile</h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="profile-edit-form">
          {errors.general && (
            <div className="error-message general-error">
              {errors.general}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">
              <User size={18} />
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
              placeholder="Enter your full name"
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <Mail size={18} />
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              placeholder="Enter your email address"
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="university">
              <GraduationCap size={18} />
              University *
            </label>
            <input
              type="text"
              id="university"
              name="university"
              value={formData.university}
              onChange={handleChange}
              className={errors.university ? 'error' : ''}
              placeholder="Enter your university"
            />
            {errors.university && <span className="error-text">{errors.university}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="faculty">
              <GraduationCap size={18} />
              Faculty *
            </label>
            <input
              type="text"
              id="faculty"
              name="faculty"
              value={formData.faculty}
              onChange={handleChange}
              className={errors.faculty ? 'error' : ''}
              placeholder="Enter your faculty"
            />
            {errors.faculty && <span className="error-text">{errors.faculty}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="year">
              <Calendar size={18} />
              Academic Year *
            </label>
            <select
              id="year"
              name="year"
              value={formData.year}
              onChange={handleChange}
              className={errors.year ? 'error' : ''}
            >
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
              <option value="5+">5+ Year</option>
            </select>
            {errors.year && <span className="error-text">{errors.year}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="gpa">
              <Award size={18} />
              GPA (Optional)
            </label>
            <input
              type="number"
              id="gpa"
              name="gpa"
              value={formData.gpa}
              onChange={handleChange}
              className={errors.gpa ? 'error' : ''}
              placeholder="Enter your GPA (0.0 - 4.0)"
              min="0"
              max="4"
              step="0.01"
            />
            {errors.gpa && <span className="error-text">{errors.gpa}</span>}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEdit;