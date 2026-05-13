import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { 
  getPlatformStats, 
  getReportedContent, 
  deleteResourceAdmin, 
  toggleUserAccess 
} from '../controllers/adminController.js';

const router = express.Router();

// Middleware to check for Admin role
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Requires Admin role' });
  }
};

// All admin routes require authentication and admin role
router.use(authenticate, isAdmin);

router.get('/stats', getPlatformStats);
router.get('/reports', getReportedContent);
router.delete('/delete-resource', deleteResourceAdmin);
router.post('/user-access', toggleUserAccess);

export default router;
