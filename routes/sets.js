import { Router } from 'express';
import { diskStorage } from 'multer';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

import {
  showCreateForm,
  createSet,
  showSet,
  showUploadForm,
  uploadCSV,
  deleteSet,
} from '../controllers/setController.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config
const storage = diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, fieldSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed.'));
    }
  },
});

// Routes
router.get('/new', showCreateForm);
router.post('/', createSet);
router.get('/:id', showSet);
router.get('/:id/upload', showUploadForm);
router.post(
  '/:id/upload',
  (req, res, next) => {
    upload.single('csvFile')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          req.flash('error', 'File is too large. Maximum allowed file size is 5MB.');
        } else {
          req.flash('error', err.message || 'File upload failed. Only valid CSV files are allowed.');
        }
        return res.redirect(`/sets/${req.params.id}/upload`);
      }
      next();
    });
  },
  uploadCSV
);
router.post('/:id/delete', deleteSet);

export default router;
