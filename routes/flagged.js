import { Router } from 'express';
import { showFlagged } from '../controllers/questionController.js';

const router = Router();

// GET /flagged
router.get('/', showFlagged);

export default router;
