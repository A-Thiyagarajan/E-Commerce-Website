import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api, { errorText } from '../services/api';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async event => {
    event.preventDefault();
    if (form.password !== form.confirm) {
      setError('Those passwords do not match.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await register(form);
      if (location.state?.addToCart) {
        const { data } = await api.get(`/products/${location.state.addToCart.productId}`);
        for (let index = 0; index < Math.min(location.state.addToCart.quantity || 1, data.product.stock); index++) add(data.product);
        navigate(location.state.from || '/products', { replace: true });
      } else {
        navigate(location.state?.from || '/profile', { state: location.state?.routeState });
      }
    } catch (requestError) {
      setError(errorText(requestError));
    } finally {
      setBusy(false);
    }
  };

  return <main className="auth-layout">
    <aside className="auth-image register-image" aria-label="ShopStack everyday finds">
      <img className="register-lifestyle-photo" src="/signup/register-lifestyle.png" alt="A curated collection of everyday finds, including knitwear, skincare, a book, a mug, and headphones"/>
      <div className="register-image-copy">
        <span>THOUGHTFUL FINDS, EVERY DAY</span>
        <h2>A little joy,<br/>delivered.</h2>
        <p>Good things for home, style, and everything in between.</p>
      </div>
    </aside>

    <form className="auth-form" onSubmit={submit}>
      <span className="eyebrow">A GOOD PLACE TO START</span>
      <h1>Make yourself <em>at home.</em></h1>
      <p>Create an account for a smoother kind of shopping.</p>
      {error && <div className="notice error">{error}</div>}
      <label>Full name<input required maxLength="100" autoComplete="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></label>
      <label>Email address<input type="email" autoComplete="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}/></label>
      <div className="form-row">
        <label>Password<span className="password-control"><input type={show ? 'text' : 'password'} minLength="8" required autoComplete="new-password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })}/><button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
        <label>Confirm password<span className="password-control"><input type={showConfirm ? 'text' : 'password'} minLength="8" required autoComplete="new-password" value={form.confirm} onChange={event => setForm({ ...form, confirm: event.target.value })}/><button type="button" aria-label={showConfirm ? 'Hide confirmation' : 'Show confirmation'} onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
      </div>
      <button className="button" disabled={busy}>{busy ? 'Creating your account…' : 'Create account'}</button>
      <div className="auth-switch">Already have an account? <Link to="/login" state={location.state}>Sign in</Link></div>
    </form>
  </main>;
}
