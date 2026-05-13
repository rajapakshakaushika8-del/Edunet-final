import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        console.log('Token found, checking authentication status...');
        const response = await authAPI.getProfile();
        console.log('User authenticated:', response.data.user);
        setUser(response.data.user);
      } else {
        console.log('No token found');
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      if (error.response && error.response.status === 401) {
        console.log('Token expired or invalid, removing from storage');
        localStorage.removeItem('token');
        setUser(null);
      } else {
        console.log('Network or server error during auth check, keeping token');
        // For network errors, we keep the token and don't set user to null
        // The user can try refreshing or the connection might recover
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    setUser(user);
    
    return response;
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    setUser(user);
    
    return response;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const value = {
    user,
    token: localStorage.getItem('token'),
    login,
    register,
    logout,
    updateUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};