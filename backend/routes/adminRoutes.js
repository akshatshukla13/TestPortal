import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import {
  addQuestion,
  assignUsers,
  copyQuestions,
  createTest,
  deleteQuestion,
  deleteTest,
  duplicateTest,
  getAssignedUsers,
  getDashboardStats,
  getAllTests,
  listUsers,
  updateApproval,
  updateQuestion,
  updateSchedule,
  updateTest,
  uploadImage,
} from '../controllers/adminController.js';
import {
  listQuestionBank,
  createBankQuestion,
  updateBankQuestion,
  deleteBankQuestion,
  addBankQuestionsToTest,
  getDistinctSubjects,
} from '../controllers/questionBankController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Admin API rate limiter: 120 requests/minute per IP
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many admin requests. Please slow down.' },
});

router.use(adminLimiter, protect, requireRole('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/users', listUsers);

router.get('/tests', getAllTests);
router.post('/tests', createTest);
router.patch('/tests/:testId', updateTest);
router.delete('/tests/:testId', deleteTest);
router.post('/tests/:testId/duplicate', duplicateTest);
router.patch('/tests/:testId/approve', updateApproval);
router.patch('/tests/:testId/schedule', updateSchedule);
router.post('/tests/:testId/questions', addQuestion);
router.patch('/tests/:testId/questions/:questionId', updateQuestion);
router.delete('/tests/:testId/questions/:questionId', deleteQuestion);
router.post('/tests/:testId/questions/copy', copyQuestions);
router.post('/tests/:testId/questions/from-bank', addBankQuestionsToTest);
router.post('/tests/:testId/assign-users', assignUsers);
router.get('/tests/:testId/assigned-users', getAssignedUsers);
router.post('/upload-image', upload.single('image'), uploadImage);

// Question Bank
router.get('/question-bank', listQuestionBank);
router.get('/question-bank/subjects', getDistinctSubjects);
router.post('/question-bank', createBankQuestion);
router.patch('/question-bank/:questionId', updateBankQuestion);
router.delete('/question-bank/:questionId', deleteBankQuestion);

export default router;
