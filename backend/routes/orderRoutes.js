import { Router } from 'express';
import { createOrder, myOrders, getOrder, cancelMyOrder, payOrderWithWallet } from '../controllers/orderController.js'; import { protect } from '../middleware/authMiddleware.js';
const router = Router(); router.use(protect); router.post('/', createOrder); router.get('/mine', myOrders); router.post('/:id/cancel', cancelMyOrder); router.post('/:id/pay-wallet', payOrderWithWallet); router.get('/:id', getOrder);
export default router;
