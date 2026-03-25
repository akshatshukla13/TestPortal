import { Router } from 'express';
import multer from 'multer';
import {
  addQuestion,
  copyQuestions,
  createTest,
  getAllTests,
  updateApproval,
  updateSchedule,
  uploadImage,
} from '../controllers/adminController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect, requireRole('admin'));

router.get('/tests', getAllTests);
router.post('/tests', createTest);
router.patch('/tests/:testId/approve', updateApproval);
router.patch('/tests/:testId/schedule', updateSchedule);
router.post('/tests/:testId/questions', addQuestion);
router.post('/tests/:testId/questions/copy', copyQuestions);
router.post('/upload-image', upload.single('image'), uploadImage);

export default router;
