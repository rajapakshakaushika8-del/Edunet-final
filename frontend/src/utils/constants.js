// Application Constants
export const APP_CONFIG = {
  NAME: 'EduNet Sri Lanka',
  VERSION: '1.0.0',
  DESCRIPTION: 'Building bridges between isolated learners',
  SUPPORT_EMAIL: 'support@edunet.lk',
  CONTACT_PHONE: '+94 11 234 5678'
};

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile',
    UPDATE_PROFILE: '/auth/profile'
  },
  USERS: {
    STUDY_STATS: '/users/study-stats',
    STUDY_ROOMS: '/users/study-rooms'
  },
  STUDY_ROOMS: {
    BASE: '/study-rooms',
    JOIN: '/study-rooms/:id/join',
    LEAVE: '/study-rooms/:id/leave'
  },
  RESOURCES: {
    BASE: '/resources',
    UPLOAD: '/resources',
    DOWNLOAD: '/resources/:id/download'
  }
};

// Sri Lankan Universities
export const SRI_LANKAN_UNIVERSITIES = [
  'University of Colombo',
  'University of Peradeniya',
  'University of Sri Jayewardenepura',
  'University of Kelaniya',
  'University of Moratuwa',
  'University of Jaffna',
  'University of Ruhuna',
  'Eastern University, Sri Lanka',
  'South Eastern University of Sri Lanka',
  'Rajarata University of Sri Lanka',
  'Sabaragamuwa University of Sri Lanka',
  'Wayamba University of Sri Lanka',
  'Uva Wellassa University',
  'University of the Visual & Performing Arts',
  'Open University of Sri Lanka',
  'University of Vocational Technology',
  'Other'
];

// Academic Faculties
export const ACADEMIC_FACULTIES = [
  'Faculty of Engineering',
  'Faculty of Medicine',
  'Faculty of Science',
  'Faculty of Arts',
  'Faculty of Law',
  'Faculty of Management & Finance',
  'Faculty of Agriculture',
  'Faculty of Allied Health Sciences',
  'Faculty of Architecture',
  'Faculty of Computing',
  'Faculty of Education',
  'Faculty of Fisheries & Marine Sciences',
  'Faculty of Humanities & Social Sciences',
  'Faculty of Pharmacy',
  'Faculty of Technology'
];

// Course Categories
export const COURSE_CATEGORIES = [
  'Engineering',
  'Medicine',
  'Computer Science',
  'Law',
  'Business',
  'Arts',
  'Science',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Economics',
  'Psychology',
  'Sociology',
  'Languages',
  'History',
  'Philosophy',
  'Agriculture',
  'Architecture',
  'Other'
];

// Resource Types
export const RESOURCE_TYPES = {
  NOTES: 'notes',
  PAST_PAPER: 'past-paper',
  PRESENTATION: 'presentation',
  VIDEO: 'video',
  OTHER: 'other'
};

export const RESOURCE_TYPE_LABELS = {
  [RESOURCE_TYPES.NOTES]: 'Study Notes',
  [RESOURCE_TYPES.PAST_PAPER]: 'Past Papers',
  [RESOURCE_TYPES.PRESENTATION]: 'Presentations',
  [RESOURCE_TYPES.VIDEO]: 'Video Lectures',
  [RESOURCE_TYPES.OTHER]: 'Other Resources'
};

// Study Room Settings
export const STUDY_ROOM_SETTINGS = {
  MAX_MEMBERS: 50,
  MIN_MEMBERS: 2,
  DEFAULT_MEMBERS: 20
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
  STUDENT: 'student'
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'Please login to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  DEFAULT: 'Something went wrong. Please try again.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  REGISTRATION: 'Account created successfully! Welcome to EduNet.',
  LOGIN: 'Login successful! Welcome back.',
  PROFILE_UPDATE: 'Profile updated successfully.',
  STUDY_ROOM_CREATED: 'Study room created successfully.',
  STUDY_ROOM_JOINED: 'Successfully joined the study room.',
  RESOURCE_UPLOADED: 'Resource uploaded successfully.'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'token',
  USER_DATA: 'user',
  THEME_PREFERENCE: 'theme',
  LANGUAGE: 'language'
};

// Date & Time Formats
export const DATE_FORMATS = {
  DISPLAY_DATE: 'DD MMM YYYY',
  DISPLAY_TIME: 'hh:mm A',
  DISPLAY_DATETIME: 'DD MMM YYYY, hh:mm A',
  API_DATE: 'YYYY-MM-DD'
};

// Feature Flags (for future feature rollouts)
export const FEATURE_FLAGS = {
  REAL_TIME_CHAT: true,
  VIDEO_CONFERENCING: false, // Coming soon
  WHITEBOARD: false, // Coming soon
  FILE_SHARING: true,
  PROGRESS_TRACKING: true
};

// Performance Constants
export const PERFORMANCE = {
  DEBOUNCE_DELAY: 300, // ms for search debouncing
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};

// Theme Colors (for consistent styling)
export const THEME_COLORS = {
  PRIMARY: '#2c5aa0',
  SECONDARY: '#f8b500',
  ACCENT: '#28a745',
  DANGER: '#dc3545',
  WARNING: '#ffc107',
  INFO: '#17a2b8',
  LIGHT: '#f8f9fa',
  DARK: '#343a40',
  SUCCESS: '#28a745'
};

export default {
  APP_CONFIG,
  API_ENDPOINTS,
  SRI_LANKAN_UNIVERSITIES,
  ACADEMIC_FACULTIES,
  COURSE_CATEGORIES,
  RESOURCE_TYPES,
  STUDY_ROOM_SETTINGS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  THEME_COLORS
};