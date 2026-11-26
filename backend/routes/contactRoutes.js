import{Router}from'express';import{submitContact}from'../controllers/contactController.js';import{protect}from'../middleware/authMiddleware.js';
const router=Router();router.post('/',(req,res,next)=>{if(req.headers.authorization)return protect(req,res,next);next();},submitContact);export default router;
