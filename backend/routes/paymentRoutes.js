import {Router}from'express';import{paymentConfig,createPaymentOrder,verifyPayment}from'../controllers/paymentController.js';import{protect}from'../middleware/authMiddleware.js';
const router=Router();router.get('/config',paymentConfig);router.post('/order',protect,createPaymentOrder);router.post('/verify',protect,verifyPayment);export default router;
