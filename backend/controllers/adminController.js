import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import mongoose from 'mongoose';
import { findOrdersWithProductImages } from '../utils/orderImages.js';
export async function dashboard(req, res) {
  const [products, users, orders, sales] = await Promise.all([Product.countDocuments(), User.countDocuments({ role: 'customer' }), Order.countDocuments(), Order.aggregate([{ $match: { status: { $ne: 'Cancelled' },paymentStatus:{$ne:'Demo paid'} } }, { $group: { _id: null, total: { $sum: '$total' } } }])]);
  res.json({ stats: { products, users, orders, sales: sales[0]?.total || 0 } });
}
export async function users(req, res) { res.json({ users: await User.find({ role: 'customer' }).select('name email createdAt').sort({ createdAt: -1 }) }); }
export async function orders(req, res) { res.json({ orders: await findOrdersWithProductImages(Order.find().populate('user', 'name email').sort({ createdAt: -1 })) }); }
export async function updateOrderStatus(req, res) {
  const allowed = ['Pending','Processing','Shipped','Delivered','Cancelled'];
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Invalid order ID' });
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid order status' });
  const session = await mongoose.startSession();
  try {
    let order;
    let conflict = '';
    await session.withTransaction(async () => {
      order = await Order.findById(req.params.id).session(session);
      if (!order) return;
      if (order.status === 'Cancelled' && req.body.status !== 'Cancelled') {
        conflict = 'Cancelled orders cannot be reopened';
        return;
      }
      if (order.status !== 'Cancelled' && req.body.status === 'Cancelled') {
        const quantities = new Map();
        for (const item of order.items) {
          const productId = String(item.product || '');
          if (productId) quantities.set(productId, (quantities.get(productId) || 0) + item.quantity);
        }
        for (const [productId, quantity] of quantities) {
          await Product.updateOne({ _id: productId }, { $inc: { stock: quantity } }, { session });
        }
      }
      order.status = req.body.status;
      await order.save({ session });
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (conflict) return res.status(409).json({ message: conflict });
    res.json({ order });
  } finally {
    await session.endSession();
  }
}
