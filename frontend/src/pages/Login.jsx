import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, EyeOff, PackageCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api, { errorText } from '../services/api';
import ProductImage from '../components/ProductImage';

const loginVisualProducts = [
  { name: 'iPhone 15', category: 'Electronics', className: 'auth-collage-phone', alt: 'iPhone 15 smartphone' },
  { name: 'JBL Tune 510BT', category: 'Electronics', className: 'auth-collage-headphones', alt: 'JBL Tune 510BT headphones' },
  { name: 'Fire-Boltt Smartwatch', category: 'Electronics', className: 'auth-collage-watch', alt: 'Fire-Boltt smartwatch' },
  { name: 'Mens Cotton T-Shirt', category: 'Fashion', className: 'auth-collage-shirt', alt: 'Men’s cotton T-shirt' },
  { name: 'Sports Shoes', category: 'Sports', className: 'auth-collage-shoes', alt: 'Sports shoes' },
  { name: 'Cetaphil Gentle Cleanser', category: 'Beauty', className: 'auth-collage-beauty', alt: 'Cetaphil gentle cleanser' },
  { name: 'Ceramic Coffee Mug Set', category: 'Home & Kitchen', className: 'auth-collage-home', alt: 'Ceramic coffee mug set' },
  { name: 'Atomic Habits', category: 'Books', className: 'auth-collage-book', alt: 'Atomic Habits book' }
];

export default function Login({ trackOrders = false }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { user, ready, login } = useAuth();
  const { add } = useCart();
  const nav = useNavigate();
  const loc = useLocation();

  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const authenticatedUser = await login(form);
      if (trackOrders) {
        nav('/orders', { replace: true });
      } else if (loc.state?.addToCart) {
        const { data } = await api.get(`/products/${loc.state.addToCart.productId}`);
        for (let i = 0; i < Math.min(loc.state.addToCart.quantity || 1, data.product.stock); i++) add(data.product);
        nav(loc.state.from || '/products', { replace: true });
      } else {
        nav(loc.state?.from || (authenticatedUser.role === 'admin' ? '/admin' : '/'), { state: loc.state?.routeState });
      }
    } catch (requestError) {
      setError(errorText(requestError));
    } finally {
      setBusy(false);
    }
  };

  if (trackOrders && !ready) {
    return <main className="shell page-main track-orders-page"><div className="track-orders-loading">Checking your ShopStack account…</div></main>;
  }
  if (trackOrders && user) return <Navigate to="/orders" replace />;
  if (!trackOrders && ready && user) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;

  const loginForm = <form className={`auth-form ${trackOrders ? 'track-login-form' : 'auth-form-login'}`} onSubmit={submit}>
    {!trackOrders && <><span className="eyebrow">WELCOME BACK</span><h1>Come on <em>in.</em></h1><p>Your favorite finds are right where you left them.</p></>}
    {error && <div className="notice error">{error}</div>}
    <label>Email address<input type="email" autoComplete="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
    <label>Password<span className="password-control"><input type={show ? 'text' : 'password'} autoComplete="current-password" required value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /><button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
    <button className="button" disabled={busy}>{busy ? 'Signing in…' : trackOrders ? 'Sign in to view orders' : 'Sign in'}</button>
    {!trackOrders && <div className="auth-switch">New around here? <Link to="/register" state={loc.state}>Create an account</Link></div>}
  </form>;

  if (trackOrders) {
    return <main className="shell page-main track-orders-page">
      <div className="breadcrumbs"><Link to="/">Home</Link> / Track &amp; Orders</div>
      <div className="track-orders-layout">
        <section className="track-orders-intro"><span className="market-kicker">SHOPSTACK ORDER CENTER</span><h1>Track your <em>orders.</em></h1><p>Sign in to see delivery updates, payment details, and every item from your ShopStack purchases.</p><div className="track-order-benefits"><span><PackageCheck size={18} /> All your orders in one place</span><span><ShieldCheck size={18} /> Private to your account</span><span><CheckCircle2 size={18} /> Updates through delivery</span></div></section>
        <section className="track-login-card"><span className="track-login-icon"><PackageCheck size={22} /></span><span className="market-kicker">YOUR SHOPSTACK PURCHASES</span><h2>Sign in to view orders</h2><p>Use the email and password for your ShopStack account.</p>{loginForm}<div className="track-login-links"><span>New around here? <Link to="/register" state={{ from: '/orders' }}>Create an account</Link></span><Link className="track-back-link" to="/">← Back to shopping</Link></div></section>
      </div>
    </main>;
  }

  return <main className="account-signin-page"><div className="account-signin-breadcrumb shell"><Link to="/">Home</Link><span>/</span><span>Account</span><span>/</span><b>Sign in</b></div><div className="auth-layout auth-layout-login"><aside className="auth-image auth-image-login" aria-label="ShopStack shopping categories"><div className="auth-promo-copy"><span className="auth-brand">SHOPSTACK<span>+</span></span><span className="auth-promo-kicker">YOUR SHOPPING JOURNEY</span><h2>Good things. Great finds. All in one place.</h2><p>Discover products you love across all your favorite categories.</p></div><div className="auth-collage" aria-label="Products from electronics, fashion, beauty, home, and books">{loginVisualProducts.map(product => <div className={`auth-collage-card ${product.className}`} key={product.name}><ProductImage product={product} alt={product.alt} className="auth-collage-photo" loading="eager" /></div>)}</div><span className="auth-promo-foot">A LITTLE SOMETHING FOR EVERY DAY</span></aside><section className="account-login-card" aria-label="Sign in to your account">{loginForm}</section></div></main>;
}
