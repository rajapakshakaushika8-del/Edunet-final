import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

/**
 * Utility functions for EduNet Sri Lanka backend
 */

/**
 * Generate a JWT token
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {string} JWT token
 */
export const generateToken = (userId, email) => {
  return jwt.sign(
    { 
      userId, 
      email,
      iss: 'edunet-sri-lanka',
      aud: 'edunet-users'
    },
    process.env.JWT_SECRET || 'edunet-secret-key',
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
      algorithm: 'HS256'
    }
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'edunet-secret-key');
};

/**
 * Generate a random alphanumeric code
 * @param {number} length - Length of the code
 * @returns {string} Random code
 */
export const generateRandomCode = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate a study room invite code
 * @returns {string} Invite code in format ROOM-XXXX-XXXX
 */
export const generateInviteCode = () => {
  const part1 = generateRandomCode(4).toUpperCase();
  const part2 = generateRandomCode(4).toUpperCase();
  return `ROOM-${part1}-${part2}`;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Sri Lankan university email
 * @param {string} email - Email to validate
 * @returns {boolean} True if it's a university email
 */
export const isUniversityEmail = (email) => {
  const universityDomains = [
    'ac.lk',
    'lk',
    // Add more specific university domains as needed
  ];
  
  return universityDomains.some(domain => email.toLowerCase().endsWith(domain));
};

/**
 * Sanitize user input for security
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Format file size to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Calculate study session duration in minutes
 * @param {Date} startTime - Session start time
 * @param {Date} endTime - Session end time
 * @returns {number} Duration in minutes
 */
export const calculateSessionDuration = (startTime, endTime) => {
  const durationMs = new Date(endTime) - new Date(startTime);
  return Math.round(durationMs / (1000 * 60)); // Convert to minutes
};

/**
 * Generate weekly study report data
 * @param {Array} studySessions - Array of study sessions
 * @returns {Object} Weekly study statistics
 */
export const generateWeeklyReport = (studySessions) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const recentSessions = studySessions.filter(
    session => new Date(session.startTime) >= oneWeekAgo
  );
  
  const totalStudyTime = recentSessions.reduce(
    (total, session) => total + (session.duration || 0), 0
  );
  
  const subjects = [...new Set(recentSessions.map(session => session.subject))];
  const averageSessionTime = recentSessions.length > 0 
    ? Math.round(totalStudyTime / recentSessions.length) 
    : 0;
  
  return {
    totalStudyTime,
    sessionCount: recentSessions.length,
    subjectsCovered: subjects.length,
    averageSessionTime,
    sessions: recentSessions
  };
};

/**
 * Paginate MongoDB query results
 * @param {Model} model - Mongoose model
 * @param {Object} query - Query object
 * @param {Object} options - Pagination options
 * @returns {Object} Paginated results
 */
export const paginateResults = async (model, query = {}, options = {}) => {
  const {
    page = 1,
    limit = 10,
    sort = { createdAt: -1 },
    populate = '',
    select = ''
  } = options;
  
  const skip = (page - 1) * limit;
  
  const [results, total] = await Promise.all([
    model.find(query)
      .populate(populate)
      .select(select)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    model.countDocuments(query)
  ]);
  
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    results,
    pagination: {
      current: page,
      total,
      pageSize: limit,
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null
    }
  };
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId
 */
export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Create slug from text
 * @param {string} text - Text to convert to slug
 * @returns {string} Slugified text
 */
export const createSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Calculate resource rating statistics
 * @param {Array} ratings - Array of rating objects
 * @returns {Object} Rating statistics
 */
export const calculateRatingStats = (ratings) => {
  if (!ratings || ratings.length === 0) {
    return {
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
  
  const total = ratings.reduce((sum, rating) => sum + rating.rating, 0);
  const average = total / ratings.length;
  
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach(rating => {
    distribution[rating.rating]++;
  });
  
  return {
    average: Math.round(average * 10) / 10, // Round to 1 decimal
    count: ratings.length,
    distribution
  };
};

/**
 * Format duration in minutes to human readable format
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${remainingMinutes} min`;
};

/**
 * Generate progress percentage
 * @param {number} completed - Completed items
 * @param {number} total - Total items
 * @returns {number} Progress percentage
 */
export const calculateProgress = (completed, total) => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

/**
 * Error response formatter
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Array} details - Additional error details
 * @returns {Object} Formatted error response
 */
export const errorResponse = (message, statusCode = 500, details = []) => {
  return {
    success: false,
    error: {
      message,
      statusCode,
      details,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Success response formatter
 * @param {string} message - Success message
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted success response
 */
export const successResponse = (message, data = null, statusCode = 200) => {
  return {
    success: true,
    message,
    data,
    statusCode,
    timestamp: new Date().toISOString()
  };
};

/**
 * Validate file upload
 * @param {Object} file - File object
 * @param {Array} allowedTypes - Allowed MIME types
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {Object} Validation result
 */
export const validateFileUpload = (file, allowedTypes, maxSize) => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }
  
  if (!allowedTypes.includes(file.mimetype)) {
    return { isValid: false, error: 'File type not allowed' };
  }
  
  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: `File size too large. Maximum allowed: ${formatFileSize(maxSize)}` 
    };
  }
  
  return { isValid: true, error: null };
};

/**
 * Get current academic year for Sri Lankan universities
 * @returns {Object} Academic year information
 */
export const getCurrentAcademicYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
  
  // Sri Lankan academic year typically starts in October
  let academicYear;
  if (currentMonth >= 10) {
    academicYear = `${currentYear}/${currentYear + 1}`;
  } else {
    academicYear = `${currentYear - 1}/${currentYear}`;
  }
  
  return {
    year: academicYear,
    semester: currentMonth >= 1 && currentMonth <= 4 ? 2 : 1 // Simplified semester calculation
  };
};

/**
 * Delay execution (useful for testing or rate limiting)
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
export const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Logger utility (can be enhanced with proper logging library)
 */
export const logger = {
  info: (message, data = null) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, data || '');
  },
  
  error: (message, error = null) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error || '');
  },
  
  warn: (message, data = null) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, data || '');
  },
  
  debug: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`, data || '');
    }
  }
};

export default {
  generateToken,
  verifyToken,
  generateRandomCode,
  generateInviteCode,
  isValidEmail,
  isUniversityEmail,
  sanitizeInput,
  formatFileSize,
  calculateSessionDuration,
  generateWeeklyReport,
  paginateResults,
  isValidObjectId,
  createSlug,
  calculateRatingStats,
  formatDuration,
  calculateProgress,
  errorResponse,
  successResponse,
  validateFileUpload,
  getCurrentAcademicYear,
  delay,
  logger
};