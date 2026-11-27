
import { Router } from 'express';

import {
  paymentConfig,
  createPaymentOrder,
  verifyPayment
} from '../controllers/paymentController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Check payment configuration
router.get('/config', paymentConfig);

// Create payment order
router.post('/order', protect, createPaymentOrder);

// Verify payment
router.post('/verify', protect, verifyPayment);

export default router;
