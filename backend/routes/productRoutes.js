import { Router } from 'express';
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct, uploadProductImage } from '../controllers/productController.js';
import { protect } from '../middleware/authMiddleware.js'; import { adminOnly } from '../middleware/adminMiddleware.js';
const router = Router();
router.get('/', listProducts); router.get('/:id', getProduct); router.post('/upload-image', protect, adminOnly, uploadProductImage); router.post('/', protect, adminOnly, createProduct); router.put('/:id', protect, adminOnly, updateProduct); router.delete('/:id', protect, adminOnly, deleteProduct);
export default router;
