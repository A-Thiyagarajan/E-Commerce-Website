import { Router } from 'express';
import { dashboard, users, orders, updateOrderStatus, adjustUserWallet } from '../controllers/adminController.js'; import { listContactMessages, updateContactStatus } from '../controllers/contactController.js'; import { protect } from '../middleware/authMiddleware.js'; import { adminOnly } from '../middleware/adminMiddleware.js';
import { listWithdrawals, resolveWithdrawal } from '../controllers/walletController.js';
const router = Router(); router.use(protect, adminOnly); router.get('/dashboard', dashboard); router.get('/users', users); router.patch('/users/:id/wallet', adjustUserWallet); router.get('/wallet/withdrawals', listWithdrawals); router.patch('/wallet/withdrawals/:id', resolveWithdrawal); router.get('/orders', orders); router.patch('/orders/:id/status', updateOrderStatus); router.get('/contact',listContactMessages); router.patch('/contact/:id/status',updateContactStatus);
export default router;
