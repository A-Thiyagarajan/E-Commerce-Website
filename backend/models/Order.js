import mongoose from 'mongoose';
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, name: String, category: String, imageUrl: String, image: String, price: Number, quantity: Number }],
  shipping: { name: String, email: String, phone: String, address: String, city: String, state: String, pinCode: String },
  paymentMethod: { type: String, enum: ['COD','ONLINE','DEMO','WALLET'], default: 'COD' },
  paymentStatus: { type: String, enum: ['Unpaid','Paid','Demo paid'], default: 'Unpaid' },
  paymentGatewayId: { type: String, default: '' },
  walletPaid: { type: Number, default: 0 },
  walletRefunded: { type: Number, default: 0 },
  cancelledBy: { type: String, enum: ['user', 'admin'], default: null },
  stockRestored: { type: Boolean, default: false },
  paymentProviderMethod: { type: String, default: '' },
  total: { type: Number, required: true },
  status: { type: String, enum: ['Pending','Processing','Shipped','Delivered','Cancelled'], default: 'Pending' }
}, { timestamps: true });
export default mongoose.model('Order', orderSchema);
