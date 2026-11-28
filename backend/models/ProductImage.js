import mongoose from 'mongoose';

const productImageSchema = new mongoose.Schema({
  contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
  data: { type: Buffer, required: true }
}, { timestamps: true });

export default mongoose.model('ProductImage', productImageSchema);
