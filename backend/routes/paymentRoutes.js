
import { Router } from 'express';

import {
  paymentConfig,
  createPaymentOrder,
  verifyPayment,
  cancelPayment
} from '../controllers/paymentController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Check payment configuration
router.get('/config', paymentConfig);

// Create payment order
router.post('/order', protect, createPaymentOrder);

// Verify payment
router.post('/verify', protect, verifyPayment);
router.post('/cancel', protect, cancelPayment);

export default router;
