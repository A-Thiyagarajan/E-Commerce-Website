import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { findOrdersWithProductImages, withProductImageFallback } from '../utils/orderImages.js';
import { productImagePath } from '../utils/productImages.js';
export async function createOrder(req, res) {
  const { items, shipping, paymentMethod = 'COD' } = req.body;
  const required = ['name','email','phone','address','city','state','pinCode'];
  if (!Array.isArray(items) || !items.length || required.some((key) => !String(shipping?.[key] || '').trim())) return res.status(400).json({ message: 'Add items and complete all shipping details' });
  if (!/^\d{10}$/.test(String(shipping?.phone || ''))) return res.status(400).json({ message: 'Phone number must contain exactly 10 digits' });
  if (!['COD','ONLINE'].includes(paymentMethod)) return res.status(400).json({ message: 'Unsupported payment method' });
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
      [order] = await Order.create([{ user: req.user._id, items: orderItems, shipping, paymentMethod, total }], { session });
    });
    res.status(201).json({ order });
  } finally { await session.endSession(); }
}
export async function myOrders(req, res) { res.json({ orders: await findOrdersWithProductImages(Order.find({ user: req.user._id }).sort({ createdAt: -1 })) }); }
export async function getOrder(req, res) {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Invalid order ID' });
  const order = await Order.findOne({ _id: req.params.id, ...(req.user.role === 'admin' ? {} : { user: req.user._id }) }).populate('items.product', 'imageUrl image category').lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json({ order: withProductImageFallback(order) });
}
