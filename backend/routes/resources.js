import express from 'express';
import multer from 'multer';
import path from 'path';
import { 
  getAllResources,
  getResourceById,
  uploadResource,
  downloadResource,
  rateResource,
  getUserResources,
  deleteResource,
  reportResource
} from '../controllers/resourceController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/resources/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept documents, images, videos
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|ppt|pptx|xls|xlsx|txt|mp4|avi|mov|wmv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('File type not supported'));
    }
  }
});

// Public routes
router.get('/', getAllResources);
router.get('/:id', getResourceById);
router.get('/:id/download', downloadResource);

// Protected routes
router.use(authenticate);

router.post('/', upload.single('file'), uploadResource);
router.post('/:id/rate', rateResource);
router.post('/:id/report', reportResource);
router.get('/user/my-resources', getUserResources);
router.delete('/:id', deleteResource);

export default router;