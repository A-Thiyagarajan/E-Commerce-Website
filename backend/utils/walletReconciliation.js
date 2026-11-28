import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import WalletTransaction from '../models/WalletTransaction.js';

// Older demo checkouts labelled "Wallet" as the provider, but never debited
// the ShopStack wallet. Reconcile those legacy orders once into the real ledger.
export async function reconcileLegacyWalletOrders(userId) {
  const legacyOrders = await Order.find({
    user: userId,
    status: { $ne: 'Cancelled' },
    paymentMethod: 'DEMO',
    paymentStatus: 'Demo paid',
    paymentProviderMethod: 'Wallet',
    walletPaid: { $in: [0, null] }
  }).sort({ createdAt: 1 }).select('_id').lean();

  for (const { _id } of legacyOrders) {
    const session = await mongoose.startSession();
    try {
      let insufficient = false;
      await session.withTransaction(async () => {
        const order = await Order.findOne({
          _id,
          user: userId,
          status: { $ne: 'Cancelled' },
          paymentMethod: 'DEMO',
          paymentStatus: 'Demo paid',
          paymentProviderMethod: 'Wallet',
          walletPaid: { $in: [0, null] }
        }).session(session);
        if (!order) return;

        if (order.total > 0) {
          const debit = await User.updateOne({
            _id: userId,
            $expr: { $gte: [
              { $subtract: [{ $ifNull: ['$walletBalance', 0] }, { $ifNull: ['$walletReserved', 0] }] },
              order.total
            ] }
          }, { $inc: { walletBalance: -order.total } }, { session });

          if (debit.modifiedCount !== 1) {
            insufficient = true;
            return;
          }
        }

        order.walletPaid = order.total;
        order.paymentMethod = 'WALLET';
        order.paymentStatus = 'Paid';
        order.paymentProviderMethod = 'ShopStack wallet';
        await order.save({ session });
        if (order.total > 0) await WalletTransaction.create([{
          user: userId,
          type: 'debit',
          amount: order.total,
          note: `Wallet payment for previous order #${String(order._id).slice(-8).toUpperCase()}`,
          order: order._id
        }], { session });
      });
      if (insufficient) break;
    } finally { await session.endSession(); }
  }
}

// Repair refunds skipped by older cancellation logic, including demo-paid orders.
export async function reconcileCancelledOrderRefunds(userId) {
  const cancelled = await Order.find({
    user: userId,
    status: 'Cancelled',
    $or: [
      { paymentStatus: { $in: ['Paid', 'Demo paid'] } },
      { walletPaid: { $gt: 0 } }
    ]
  }).select('_id').lean();

  for (const { _id } of cancelled) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const order = await Order.findOne({ _id, user: userId, status: 'Cancelled' }).session(session);
        if (!order) return;
        const targetRefund = ['Paid', 'Demo paid'].includes(order.paymentStatus)
          ? Number(order.total) || 0
          : Number(order.walletPaid) || 0;
        const remainingRefund = Math.round((targetRefund - (Number(order.walletRefunded) || 0)) * 100) / 100;
        if (remainingRefund <= 0) return;

        await User.updateOne({ _id: userId }, { $inc: { walletBalance: remainingRefund } }, { session });
        await WalletTransaction.create([{
          user: userId,
          type: 'refund',
          amount: remainingRefund,
          note: `Refund for previously cancelled order #${String(order._id).slice(-8).toUpperCase()}`,
          order: order._id
        }], { session });
        order.walletRefunded = targetRefund;
        await order.save({ session });
      });
    } finally { await session.endSession(); }
  }
}
