import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['credit', 'debit', 'refund', 'withdrawal'], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  note: { type: String, required: true, maxlength: 240 },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  bankAccount: { accountHolder: String, accountNumber: String, ifsc: String },
  balanceDebited: { type: Boolean, default: undefined },
  status: { type: String, enum: ['Completed', 'Pending', 'Rejected'], default: 'Completed' }
}, { timestamps: true });

export default mongoose.model('WalletTransaction', walletTransactionSchema);
