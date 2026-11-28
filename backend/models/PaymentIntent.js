import mongoose from 'mongoose';
const paymentIntentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  gatewayOrderId: { type: String, required: true, unique: true },
  gatewayPaymentId: { type: String, default: '' },
  paymentProviderMethod: { type: String, default: '' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  items: [{ product: mongoose.Schema.Types.ObjectId, name: String, category: String, imageUrl: String, image: String, price: Number, quantity: Number }],
  shipping: { name: String, email: String, phone: String, address: String, city: String, state: String, pinCode: String },
  amount: { type: Number, required: true },
  orderTotal: { type: Number, default: 0 },
  walletAmount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 15 * 60 * 1000) },
  status: { type: String, enum: ['Pending','Paid','Failed'], default: 'Pending' }
}, { timestamps: true });
export default mongoose.model('PaymentIntent', paymentIntentSchema);
