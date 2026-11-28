import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { findOrdersWithProductImages, withProductImageFallback } from '../utils/orderImages.js';
import { productImagePath } from '../utils/productImages.js';
import User from '../models/User.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { reconcileLegacyWalletOrders, reconcileCancelledOrderRefunds } from '../utils/walletReconciliation.js';
export async function createOrder(req, res) {
  const { items, shipping, paymentMethod = 'COD', useWallet = false } = req.body;
  const required = ['name','email','phone','address','city','state','pinCode'];
  if (!Array.isArray(items) || !items.length || required.some((key) => !String(shipping?.[key] || '').trim())) return res.status(400).json({ message: 'Add items and complete all shipping details' });
  if (!/^\d{10}$/.test(String(shipping?.phone || ''))) return res.status(400).json({ message: 'Phone number must contain exactly 10 digits' });
  if (!['COD','ONLINE','WALLET'].includes(paymentMethod)) return res.status(400).json({ message: 'Unsupported payment method' });
  if (paymentMethod === 'ONLINE') return res.status(400).json({ message: 'Online payment is coming soon. Please choose Cash on Delivery.' });
  const grouped = new Map();
  for (const item of items) {
    const id = String(item.productId || '');
    if (!/^[a-f\d]{24}$/i.test(id) || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) return res.status(400).json({ message: 'Invalid cart item' });
    grouped.set(id, (grouped.get(id) || 0) + Number(item.quantity));
  }
  const session = await mongoose.startSession();
  try {
    let order;
    await session.withTransaction(async () => {
      const products = await Product.find({ _id: { $in: [...grouped.keys()] } }).session(session);
      if (products.length !== grouped.size) throw Object.assign(new Error('A product is no longer available'), { status: 409 });
      const orderItems = [];
      let total = 0;
      for (const product of products) {
        const quantity = grouped.get(String(product._id));
        if (product.stock < quantity) throw Object.assign(new Error(`${product.name} does not have enough stock`), { status: 409 });
        total += product.price * quantity;
        orderItems.push({ product: product._id, name: product.name, category: product.category, imageUrl: productImagePath(product), price: product.price, quantity });
        const update = await Product.updateOne({ _id: product._id, stock: { $gte: quantity } }, { $inc: { stock: -quantity } }, { session });
        if (update.modifiedCount !== 1) throw Object.assign(new Error(`${product.name} stock changed. Please try again.`), { status: 409 });
      }
      const user = await User.findById(req.user._id).select('walletBalance walletReserved').session(session);
      const availableWallet = Math.max(0, (user.walletBalance || 0) - (user.walletReserved || 0));
      const walletPaid = useWallet || paymentMethod === 'WALLET' ? Math.min(availableWallet, total) : 0;
      if (useWallet === true && availableWallet <= 0) throw Object.assign(new Error('Your wallet has no available funds. Choose another payment method.'), { status: 409 });
      if (paymentMethod === 'WALLET' && (availableWallet <= 0 || walletPaid < total)) throw Object.assign(new Error('Your available wallet balance must cover the full order before you can pay by wallet.'), { status: 409 });
      if (walletPaid > 0) {
        const debit = await User.updateOne({ _id: user._id, $expr: { $gte: [{ $subtract: [{ $ifNull: ['$walletBalance', 0] }, { $ifNull: ['$walletReserved', 0] }] }, walletPaid] } }, { $inc: { walletBalance: -walletPaid } }, { session });
        if (debit.modifiedCount !== 1) throw Object.assign(new Error('Wallet balance changed. Please try again.'), { status: 409 });
      }
      const fullyPaidByWallet = total > 0 && walletPaid >= total;
      [order] = await Order.create([{ user: req.user._id, items: orderItems, shipping, paymentMethod: fullyPaidByWallet ? 'WALLET' : paymentMethod, paymentStatus: fullyPaidByWallet ? 'Paid' : 'Unpaid', walletPaid, total }], { session });
      if (walletPaid > 0) await WalletTransaction.create([{ user: user._id, type: 'debit', amount: walletPaid, note: `Payment for order #${String(order._id).slice(-8).toUpperCase()}`, order: order._id }], { session });
    });
    const walletUser = await User.findById(req.user._id).select('walletBalance walletReserved').lean();
    res.status(201).json({ order, wallet: { balance: walletUser?.walletBalance || 0, availableBalance: Math.max(0, (walletUser?.walletBalance || 0) - (walletUser?.walletReserved || 0)), reserved: walletUser?.walletReserved || 0 } });
  } finally { await session.endSession(); }
}
export async function myOrders(req, res) { await reconcileLegacyWalletOrders(req.user._id); await reconcileCancelledOrderRefunds(req.user._id); res.json({ orders: await findOrdersWithProductImages(Order.find({ user: req.user._id }).sort({ createdAt: -1 })) }); }
export async function cancelMyOrder(req, res) {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Invalid order ID' });
  const session = await mongoose.startSession();
  try {
    let order;
    let conflict = '';
    await session.withTransaction(async () => {
      order = await Order.findOne({ _id: req.params.id, user: req.user._id }).session(session);
      if (!order) return;
      if (order.status === 'Cancelled') { conflict = 'This order is already cancelled.'; return; }
      if (order.status === 'Delivered') { conflict = 'Delivered orders cannot be cancelled.'; return; }

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

      const targetRefund = ['Paid', 'Demo paid'].includes(order.paymentStatus)
        ? Number(order.total) || 0
        : Number(order.walletPaid) || 0;
      const refund = Math.max(0, Math.round((targetRefund - (Number(order.walletRefunded) || 0)) * 100) / 100);
      if (refund > 0) {
        await User.updateOne({ _id: order.user }, { $inc: { walletBalance: refund } }, { session });
        await WalletTransaction.create([{
          user: order.user,
          type: 'refund',
          amount: refund,
          note: `Refund for cancelled order #${String(order._id).slice(-8).toUpperCase()}`,
          order: order._id
        }], { session });
        order.walletRefunded = targetRefund;
      }
      order.status = 'Cancelled';
      order.cancelledBy = 'user';
      await order.save({ session });
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (conflict) return res.status(409).json({ message: conflict });
    const walletUser = await User.findById(req.user._id).select('walletBalance walletReserved').lean();
    res.json({ order, wallet: { balance: walletUser?.walletBalance || 0, availableBalance: Math.max(0, (walletUser?.walletBalance || 0) - (walletUser?.walletReserved || 0)), reserved: walletUser?.walletReserved || 0 } });
  } finally { await session.endSession(); }
}
export async function payOrderWithWallet(req, res) {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Invalid order ID' });
  const session = await mongoose.startSession();
  try {
    let order;
    let conflict = '';
    await session.withTransaction(async () => {
      order = await Order.findOne({ _id: req.params.id, user: req.user._id }).session(session);
      if (!order) return;
      if (order.status === 'Cancelled' || order.status === 'Delivered') { conflict = 'This order can no longer be paid.'; return; }
      if (['Paid', 'Demo paid'].includes(order.paymentStatus)) { conflict = 'This order is already paid.'; return; }

      const due = Math.round((Number(order.total) - (Number(order.walletPaid) || 0)) * 100) / 100;
      if (due <= 0) { conflict = 'This order has no amount due.'; return; }
      const user = await User.findById(req.user._id).select('walletBalance walletReserved').session(session);
      const available = Math.max(0, (Number(user?.walletBalance) || 0) - (Number(user?.walletReserved) || 0));
      if (available < due) { conflict = 'Your available wallet balance must cover the remaining order amount.'; return; }
      const debit = await User.updateOne({ _id: req.user._id, $expr: { $gte: [{ $subtract: [{ $ifNull: ['$walletBalance', 0] }, { $ifNull: ['$walletReserved', 0] }] }, due] } }, { $inc: { walletBalance: -due } }, { session });
      if (debit.modifiedCount !== 1) { conflict = 'Your wallet balance changed. Refresh and try again.'; return; }

      order.walletPaid = (Number(order.walletPaid) || 0) + due;
      order.paymentMethod = 'WALLET';
      order.paymentStatus = 'Paid';
      order.paymentProviderMethod = 'ShopStack wallet';
      await order.save({ session });
      await WalletTransaction.create([{ user: req.user._id, type: 'debit', amount: due, note: `Wallet payment for order #${String(order._id).slice(-8).toUpperCase()}`, order: order._id }], { session });
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (conflict) return res.status(409).json({ message: conflict });
    const walletUser = await User.findById(req.user._id).select('walletBalance walletReserved').lean();
    res.json({ order, wallet: { balance: walletUser?.walletBalance || 0, availableBalance: Math.max(0, (walletUser?.walletBalance || 0) - (walletUser?.walletReserved || 0)), reserved: walletUser?.walletReserved || 0 } });
  } finally { await session.endSession(); }
}
export async function getOrder(req, res) {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Invalid order ID' });
  const order = await Order.findOne({ _id: req.params.id, ...(req.user.role === 'admin' ? {} : { user: req.user._id }) }).populate('items.product', 'imageUrl image category').lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json({ order: withProductImageFallback(order) });
}
