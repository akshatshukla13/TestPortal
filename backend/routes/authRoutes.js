import { Router } from 'express';
import {
	forgotPassword,
	login,
	me,
	resetPassword,
	signup,
	updateProfile,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, me);
router.patch('/profile', protect, updateProfile);

export default router;
