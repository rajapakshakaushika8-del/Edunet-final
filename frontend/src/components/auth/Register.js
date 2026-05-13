import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    university: '',
    faculty: '',
    year: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await register(formData);
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Join EduNet Sri Lanka</h2>
          <p>Create your account and start collaborating</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              University Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              placeholder="Enter your university email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="university" className="form-label">
              University
            </label>
            <select
              id="university"
              name="university"
              className="form-control"
              value={formData.university}
              onChange={handleChange}
              required
            >
              <option value="">Select your university</option>
              <option value="University of Colombo">University of Colombo</option>
              <option value="University of Peradeniya">University of Peradeniya</option>
              <option value="University of Sri Jayewardenepura">University of Sri Jayewardenepura</option>
              <option value="University of Kelaniya">University of Kelaniya</option>
              <option value="University of Moratuwa">University of Moratuwa</option>
              <option value="University of Jaffna">University of Jaffna</option>
              <option value="University of Ruhuna">University of Ruhuna</option>
              <option value="Eastern University, Sri Lanka">Eastern University, Sri Lanka</option>
              <option value="South Eastern University of Sri Lanka">South Eastern University of Sri Lanka</option>
              <option value="Rajarata University of Sri Lanka">Rajarata University of Sri Lanka</option>
              <option value="Sabaragamuwa University of Sri Lanka">Sabaragamuwa University of Sri Lanka</option>
              <option value="Wayamba University of Sri Lanka">Wayamba University of Sri Lanka</option>
              <option value="Uva Wellassa University">Uva Wellassa University</option>
              <option value="University of the Visual & Performing Arts">University of the Visual & Performing Arts</option>
              <option value="Open University of Sri Lanka">Open University of Sri Lanka</option>
              <option value="University of Vocational Technology">University of Vocational Technology</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="faculty" className="form-label">
              Faculty
            </label>
            <input
              type="text"
              id="faculty"
              name="faculty"
              className="form-control"
              placeholder="e.g., Engineering, Medicine, Science"
              value={formData.faculty}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="year" className="form-label">
              Academic Year
            </label>
            <select
              id="year"
              name="year"
              className="form-control"
              value={formData.year}
              onChange={handleChange}
              required
            >
              <option value="">Select year</option>
              <option value="1">First Year</option>
              <option value="2">Second Year</option>
              <option value="3">Third Year</option>
              <option value="4">Fourth Year</option>
              <option value="5+">Fifth Year or Above</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-control"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="form-control"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-btn"
            disabled={loading}
          >
            {loading ? <LoadingSpinner /> : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;