import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Star, ShoppingBag, Zap } from 'lucide-react';
import api, { errorText } from '../services/api';
import { getProduct } from '../services/productData';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ProductImage from '../components/ProductImage';

const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const { add } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    setProduct(null);
    setError('');
    setLoading(true);
    setQty(1);

    api.get(`/products/${id}`, { signal: controller.signal }).then(({ data }) => {
      setProduct(getProduct(data));
    }).catch(requestError => {
      if (controller.signal.aborted) return;
      setError(requestError.message === 'This product could not be loaded. Please try again.'
        ? requestError.message
        : errorText(requestError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [id]);

  if (loading) return <div className="loading-page" role="status">Loading product…</div>;
  if (error) return <main className="shell page-main"><div className="notice error" role="alert">{error}</div><Link className="button" to="/products">Back to products</Link></main>;
  if (!product) return <main className="shell page-main empty-state"><h2>Product unavailable</h2><Link className="button" to="/products">Browse products</Link></main>;

  const stock = Math.max(0, Number(product.stock) || 0);
  const addProduct = () => {
    if (!user) {
      navigate('/login', { state: { from: `/products/${id}`, addToCart: { productId: id, quantity: qty } } });
      return;
    }
    for (let index = 0; index < qty; index++) add(product);
  };

  return <main className="shell page-main"><div className="breadcrumbs"><Link to="/products"><ArrowLeft size={14}/> Back to shop</Link></div><div className="detail-layout">
    <div className="detail-image"><ProductImage src={product.imageUrl} product={product} alt={product.name || 'Product'} loading="eager"/></div>
    <div className="detail-copy"><span className="eyebrow">{String(product.category || '').toUpperCase()}</span><h1>{product.name || 'Product'}</h1>
      <div className="detail-rating"><Star size={15} fill="currentColor"/> {Number(product.rating || 0).toFixed(1)} <span>·</span> A customer favorite</div>
      <div className="detail-price">{money(product.price)}</div><p className="detail-description">{product.description || 'Product details are not available.'}</p>
      <div className="stock-note">{stock > 0 ? `${stock} in stock — ready when you are` : 'Currently out of stock'}</div>
      <div className="buy-row"><div className="quantity"><button type="button" aria-label="Decrease quantity" onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={15}/></button><span>{qty}</span><button type="button" aria-label="Increase quantity" onClick={() => setQty(Math.min(stock, qty + 1))} disabled={qty >= stock}><Plus size={15}/></button></div>
        <button className="button add-button" disabled={!stock} onClick={addProduct}><ShoppingBag size={18}/> {user ? 'Add to bag' : 'Sign in to add'}</button></div>
      <button className="detail-buy-now" disabled={!stock} onClick={() => navigate('/checkout', { state: { buyNow: { productId: product._id, quantity: qty } } })}><Zap size={16}/> Buy now · {money(Number(product.price) * qty)}</button>
      <div className="detail-perks"><span>Thoughtfully picked</span><span>Easy 30-day returns</span></div>
    </div>
  </div></main>;
}
