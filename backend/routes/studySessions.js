import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
  getSessionStats
} from '../controllers/studySessionController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET routes
router.get('/stats', getSessionStats);
router.get('/', getSessions);
router.get('/:id', getSessionById);

// POST routes
router.post('/', createSession);

// PUT routes
router.put('/:id', updateSession);

// DELETE routes
router.delete('/:id', deleteSession);

export default router;
