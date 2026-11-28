import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import mongoose from 'mongoose';
import { findOrdersWithProductImages } from '../utils/orderImages.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { reconcileLegacyWalletOrders, reconcileCancelledOrderRefunds } from '../utils/walletReconciliation.js';
const reconciledWalletUsers = new Set();
async function reconcileAllWallets() { const customers = await User.find({ role: 'customer' }).select('_id').lean(); for (const customer of customers) { const id = String(customer._id); if (!reconciledWalletUsers.has(id)) { await reconcileLegacyWalletOrders(customer._id); reconciledWalletUsers.add(id); } await reconcileCancelledOrderRefunds(customer._id); } }
export async function dashboard(req, res) {
  const [products, users, orders, sales] = await Promise.all([Product.countDocuments(), User.countDocuments({ role: 'customer' }), Order.countDocuments(), Order.aggregate([{ $match: { status: { $ne: 'Cancelled' },paymentStatus:{$ne:'Demo paid'} } }, { $group: { _id: null, total: { $sum: '$total' } } }])]);
  res.json({ stats: { products, users, orders, sales: sales[0]?.total || 0 } });
}
export async function users(req, res) { await reconcileAllWallets(); const users = await User.find({ role: 'customer' }).select('name email walletBalance walletReserved createdAt').sort({ createdAt: -1 }).lean(); res.json({ users: users.map(user => ({ ...user, availableBalance: Math.max(0, (user.walletBalance || 0) - (user.walletReserved || 0)) })) }); }
export async function orders(req, res) { await reconcileAllWallets(); res.json({ orders: await findOrdersWithProductImages(Order.find().populate('user', 'name email').sort({ createdAt: -1 })) }); }
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
      if (order.status === 'Cancelled' && order.cancelledBy === 'user' && req.body.status !== 'Cancelled') {
        conflict = 'Cancelled orders cannot be reopened';
        return;
      }
      if (order.status !== 'Cancelled' && req.body.status === 'Cancelled') {
        if (!order.stockRestored) {
          const quantities = new Map();
          for (const item of order.items) {
            const productId = String(item.product || '');
            if (productId) quantities.set(productId, (quantities.get(productId) || 0) + item.quantity);
          }
          for (const [productId, quantity] of quantities) {
            await Product.updateOne({ _id: productId }, { $inc: { stock: quantity } }, { session });
          }
          order.stockRestored = true;
        }
        const targetRefund = ['Paid', 'Demo paid'].includes(order.paymentStatus) ? order.total : order.walletPaid;
        const refund = Math.max(0, Math.round((targetRefund - (Number(order.walletRefunded) || 0)) * 100) / 100);
        if (refund > 0) {
          await User.updateOne({ _id: order.user }, { $inc: { walletBalance: refund } }, { session });
          await WalletTransaction.create([{ user: order.user, type: 'refund', amount: refund, note: `Refund for cancelled order #${String(order._id).slice(-8).toUpperCase()}`, order: order._id }], { session });
          order.walletRefunded = targetRefund;
        }
        order.cancelledBy = 'admin';
      }
      if (order.status === 'Cancelled' && order.cancelledBy === 'admin' && req.body.status !== 'Cancelled') order.stockRestored = true;
      order.status = req.body.status;
      if (req.body.status !== 'Cancelled' && order.cancelledBy === 'admin') order.cancelledBy = null;
      await order.save({ session });
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (conflict) return res.status(409).json({ message: conflict });
    res.json({ order });
  } finally {
    await session.endSession();
  }
}

export async function adjustUserWallet(req, res) {
  const amount = Math.round(Number(req.body.amount) * 100) / 100;
  const operation = req.body.operation || 'add';
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000000 || !['add', 'subtract', 'set'].includes(operation) || (operation !== 'set' && amount <= 0)) return res.status(400).json({ message: 'Enter a valid wallet adjustment.' });
  const session = await mongoose.startSession();
  try {
    let user;
    await session.withTransaction(async () => {
      user = await User.findOne({ _id: req.params.id, role: 'customer' }).session(session);
      if (!user) return;
      const oldBalance = Number(user.walletBalance) || 0;
      const reserved = Number(user.walletReserved) || 0;
      const balance = operation === 'set' ? amount + reserved : operation === 'add' ? oldBalance + amount : oldBalance - amount;
      if (balance < 0) throw Object.assign(new Error('The wallet does not have enough funds for that subtraction.'), { status: 409 });
      if (balance < reserved) throw Object.assign(new Error('That balance is reserved for an online payment in progress.'), { status: 409 });
      user.walletBalance = balance;
      await user.save({ session });
      const difference = Math.round(Math.abs(balance - oldBalance) * 100) / 100;
      if (difference) await WalletTransaction.create([{ user: user._id, type: balance >= oldBalance ? 'credit' : 'debit', amount: difference, note: String(req.body.note || `Admin ${operation} adjustment`).slice(0, 240) }], { session });
    });
    if (!user) return res.status(404).json({ message: 'Customer not found.' });
    res.json({ balance: user.walletBalance, reserved: user.walletReserved || 0, availableBalance: user.walletBalance - (user.walletReserved || 0) });
  } finally { await session.endSession(); }
}
