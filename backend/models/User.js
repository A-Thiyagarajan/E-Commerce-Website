import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  address: { fullName: { type: String, trim: true, default: '' }, phone: { type: String, trim: true, default: '' }, line1: { type: String, trim: true, default: '' }, city: { type: String, trim: true, default: '' }, state: { type: String, trim: true, default: '' }, pinCode: { type: String, trim: true, default: '' }, country: { type: String, trim: true, default: 'India' } },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' }
}, { timestamps: true });
userSchema.pre('save', async function () { if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12); });
userSchema.methods.comparePassword = function (value) { return bcrypt.compare(value, this.password); };
export default mongoose.model('User', userSchema);
