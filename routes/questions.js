import { Router } from 'express';
import { toggleFlag } from '../controllers/questionController.js';

const router = Router();

// POST /questions/:id/toggle-flag
router.post('/:id/toggle-flag', toggleFlag);

export default router;
