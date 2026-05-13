import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
};

export const userAPI = {
  updateProfile: (userData) => api.put('/users/profile', userData),
  getStudyStats: () => api.get('/users/study-stats'),
  getDashboardData: () => api.get('/users/dashboard'),
  getRecommendations: () => api.get('/users/recommendations'),
  getActivityReport: () => api.get('/users/activity-report'),
  getUserSubjects: () => api.get('/users/subjects'),
  addSubject: (subjectData) => api.post('/users/subjects', subjectData),
  updateSubject: (subjectId, subjectData) => api.put(`/users/subjects/${subjectId}`, subjectData),
  deleteSubject: (subjectId) => api.delete(`/users/subjects/${subjectId}`),
};

export const studyRoomAPI = {
  getAll: () => api.get('/study-rooms'),
  getById: (id) => api.get(`/study-rooms/${id}`),
  create: (roomData) => api.post('/study-rooms', roomData),
  update: (id, roomData) => api.put(`/study-rooms/${id}`, roomData),
  delete: (id) => api.delete(`/study-rooms/${id}`),
  end: (id) => api.patch(`/study-rooms/${id}/end`),
  join: (id) => api.post(`/study-rooms/${id}/join`),
  leave: (id) => api.post(`/study-rooms/${id}/leave`),
};

export const resourceAPI = {
  getAll: () => api.get('/resources'),
  upload: (resourceData) => api.post('/resources', resourceData),
  download: (id) => api.get(`/resources/${id}/download`),
};

export const studySessionAPI = {
  create: (sessionData) => api.post('/study-sessions', sessionData),
  getAll: () => api.get('/study-sessions'),
  getById: (id) => api.get(`/study-sessions/${id}`),
  update: (id, sessionData) => api.put(`/study-sessions/${id}`, sessionData),
  delete: (id) => api.delete(`/study-sessions/${id}`),
  getStats: () => api.get('/study-sessions/stats'),
};

export default api;