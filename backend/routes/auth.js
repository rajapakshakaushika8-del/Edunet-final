import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getProfile,
  updateProfile,
  logout,
  forgotPassword,
  resetPassword,
  deleteAccount
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('university')
    .trim()
    .notEmpty()
    .withMessage('University is required'),
  body('faculty')
    .trim()
    .notEmpty()
    .withMessage('Faculty is required'),
  body('year')
    .isIn(['1', '2', '3', '4', '5+'])
    .withMessage('Please select a valid academic year')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('university')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('University cannot be empty'),
  body('faculty')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Faculty cannot be empty'),
  body('year')
    .optional()
    .isIn(['1', '2', '3', '4', '5+'])
    .withMessage('Please select a valid academic year')
];

// Routes
router.post('/register', registerValidation, handleValidationErrors, register);
router.post('/login', loginValidation, handleValidationErrors, login);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfileValidation, handleValidationErrors, updateProfile);
router.post('/logout', authenticate, logout);
router.delete('/account', authenticate, deleteAccount);

// Password reset routes
router.post('/forgot-password',
  body('email').isEmail().withMessage('Please provide a valid email'),
  handleValidationErrors,
  forgotPassword
);

router.post('/reset-password/:token',
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors,
  resetPassword
);

export default router;