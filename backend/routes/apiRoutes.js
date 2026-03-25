import { Router } from 'express';
import { getHealth } from '../controllers/healthController.js';
import authRoutes from './authRoutes.js';
import testRoutes from './testRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

router.get('/health', getHealth);
router.use('/auth', authRoutes);
router.use('/tests', testRoutes);
router.use('/admin', adminRoutes);

export default router;
