import { Router } from 'express';
import { showQuiz, submitQuiz } from '../controllers/quizController.js';

const router = Router();

// GET /sets/:id/quiz
router.get('/:id/quiz', showQuiz);

// POST /sets/:id/quiz/submit
router.post('/:id/quiz/submit', submitQuiz);

export default router;
