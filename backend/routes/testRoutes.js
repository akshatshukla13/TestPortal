import { Router } from 'express';
import {
  getAvailableTests,
  getMyAnalysis,
  getMyDashboardSummary,
  getMyAttempts,
  getMyResult,
  getRecommendations,
  getTestSession,
  getTestById,
  saveTestProgress,
  startTestSession,
  submitTest,
} from '../controllers/testController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/available', getAvailableTests);
router.get('/my/attempts', getMyAttempts);
router.get('/my/summary', getMyDashboardSummary);
router.get('/my/recommendations', getRecommendations);
router.get('/:testId', getTestById);
router.post('/:testId/session/start', startTestSession);
router.get('/:testId/session', getTestSession);
router.patch('/:testId/session', saveTestProgress);
router.post('/:testId/submit', submitTest);
router.get('/:testId/result', getMyResult);
router.get('/:testId/analysis', getMyAnalysis);

export default router;
