import express from 'express';
import { body } from 'express-validator';
import { 
  getAllStudyRooms, 
  createStudyRoom, 
  joinStudyRoom,
  getStudyRoomById,
  updateStudyRoom,
  deleteStudyRoom,
  endStudyRoom,
  handleJoinRequest,
  getRoomRecommendations
} from '../controllers/studyRoomController.js';
import { authenticate } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Validation rules
const createStudyRoomValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Study room name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim(),
  body('course')
    .trim()
    .notEmpty()
    .withMessage('Course tag is required'),
  body('maxMembers')
    .optional()
    .isInt({ min: 2, max: 50 })
    .withMessage('Maximum members must be between 2 and 50'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

const updateStudyRoomValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Study room name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim(),
  body('course')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Course tag cannot be empty'),
  body('maxMembers')
    .optional()
    .isInt({ min: 2, max: 50 })
    .withMessage('Maximum members must be between 2 and 50'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

// Public routes
router.get('/', getAllStudyRooms);

// Protected routes
router.use(authenticate);

router.get('/recommendations', getRoomRecommendations);
router.get('/:id', getStudyRoomById);
router.post('/', createStudyRoomValidation, handleValidationErrors, createStudyRoom);
router.put('/:id', updateStudyRoomValidation, handleValidationErrors, updateStudyRoom);
router.patch('/:id/end', endStudyRoom);
router.delete('/:id', deleteStudyRoom);
router.post('/:id/join', joinStudyRoom);
router.post('/:id/requests/:userId/handle', handleJoinRequest);

export default router;