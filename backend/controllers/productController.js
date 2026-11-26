import Product from '../models/Product.js';
import { productImagePath } from '../utils/productImages.js';
import { cleanProductDescription, cleanProductName } from '../utils/productText.js';

const productResponse = product => {
  const value = product.toObject ? product.toObject() : product;
  const name = cleanProductName(value.name);
  return {
    ...value,
    name,
    description: cleanProductDescription(value.description),
    imageUrl: productImagePath({ ...value, name })
  };
};

export async function listProducts(req, res) {
  const { search = '', category, sort, featured } = req.query;
  const filter = {};
  if (category && category !== 'All') filter.category = category;
  if (featured === 'true') filter.featured = true;
  if (search.trim()) {
    const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['name','description','category'].map((field) => ({ [field]: { $regex: term, $options: 'i' } }));
  }
  const sortBy = sort === 'price-asc' ? { price: 1 } : sort === 'price-desc' ? { price: -1 } : { createdAt: -1 };
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 24, 2000));
  const page = Math.max(1, Number(req.query.page) || 1);
  const [products,total] = await Promise.all([Product.find(filter).sort(sortBy).skip((page-1)*limit).limit(limit),Product.countDocuments(filter)]);
  res.json({ products: products.map(productResponse),total,page,pages:Math.max(1,Math.ceil(total/limit)) });
}
export async function getProduct(req, res) {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Invalid product ID' });
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ product: productResponse(product) });
}
const clean = (body) => ({ name: cleanProductName(body.name), description: cleanProductDescription(body.description), price: Number(body.price), category: body.category, imageUrl: body.imageUrl || body.image, stock: Number(body.stock), rating: Number(body.rating ?? 4.5), featured: Boolean(body.featured) });
export async function createProduct(req, res) { const product = await Product.create(clean(req.body)); res.status(201).json({ product: productResponse(product) }); }
export async function updateProduct(req, res) {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Invalid product ID' });
  const product = await Product.findByIdAndUpdate(req.params.id, clean(req.body), { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ product: productResponse(product) });
}
export async function deleteProduct(req, res) {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Invalid product ID' });
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ message: 'Product deleted' });
}
