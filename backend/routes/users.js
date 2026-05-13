import express from 'express';
import { 
  getStudyStats, 
  getUserStudyRooms,
  getDashboardData,
  updateProfile,
  getUserSubjects,
  addSubject,
  updateSubject,
  deleteSubject,
  getRecommendations,
  getActivityReport,
  getPeerSuggestions
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(authenticate);

// User profile routes
router.put('/profile', updateProfile);
router.get('/study-stats', getStudyStats);
router.get('/study-rooms', getUserStudyRooms);
router.get('/dashboard', getDashboardData);
router.get('/recommendations', getRecommendations);
router.get('/activity-report', getActivityReport);
router.get('/peer-suggestions', getPeerSuggestions);

// Subject management routes
router.get('/subjects', getUserSubjects);
router.post('/subjects', addSubject);
router.put('/subjects/:subjectId', updateSubject);
router.delete('/subjects/:subjectId', deleteSubject);

export default router;