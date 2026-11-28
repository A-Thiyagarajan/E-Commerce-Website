import mongoose from 'mongoose';
import PaymentIntent from '../models/PaymentIntent.js';
import User from '../models/User.js';

export async function releaseWalletReservation(intentId, userId, { expiredOnly = false } = {}) {
  const session = await mongoose.startSession();
  try {
    let released = false;
    await session.withTransaction(async () => {
      const filter = { _id: intentId, user: userId, status: 'Pending' };
      if (expiredOnly) filter.expiresAt = { $lte: new Date() };
      const intent = await PaymentIntent.findOne(filter).session(session);
      if (!intent) return;
      const amount = intent.walletAmount;
      if (amount > 0) {
        const update = await User.updateOne({ _id: userId, walletReserved: { $gte: amount } }, { $inc: { walletReserved: -amount } }, { session });
        if (update.modifiedCount !== 1) throw new Error('Reserved wallet balance could not be released.');
      }
      intent.walletAmount = 0;
      intent.status = 'Failed';
      await intent.save({ session });
      released = true;
    });
    return released;
  } finally { await session.endSession(); }
}

export async function releaseExpiredWalletReservations(userId) {
  const expired = await PaymentIntent.find({ user: userId, status: 'Pending', walletAmount: { $gt: 0 }, expiresAt: { $lte: new Date() } }).select('_id').lean();
  for (const intent of expired) await releaseWalletReservation(intent._id, userId, { expiredOnly: true });
}
