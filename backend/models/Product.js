import mongoose from 'mongoose';
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, maxlength: 3000 },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, enum: ['Electronics','Fashion','Home & Kitchen','Accessories','Sports','Beauty','Books','Toys & Games','Grocery','Automotive','Baby & Kids'] },
  imageUrl: { type: String, required: true },
  image: { type: String },
  stock: { type: Number, required: true, min: 0, default: 0 },
  rating: { type: Number, min: 0, max: 5, default: 4.5 },
  featured: { type: Boolean, default: false }
}, { timestamps: true });
productSchema.index({ name: 'text', description: 'text' });
export default mongoose.model('Product', productSchema);
