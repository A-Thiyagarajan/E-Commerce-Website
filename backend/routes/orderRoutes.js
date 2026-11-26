import { Router } from 'express';
import { createOrder, myOrders, getOrder } from '../controllers/orderController.js'; import { protect } from '../middleware/authMiddleware.js';
const router = Router(); router.use(protect); router.post('/', createOrder); router.get('/mine', myOrders); router.get('/:id', getOrder);
export default router;
