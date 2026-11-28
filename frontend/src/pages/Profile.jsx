import { useLayoutEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Package, ShieldCheck, Save, MapPin } from 'lucide-react';
import WalletPanel from '../components/WalletPanel';

const emptyAddress = { fullName: '', phone: '', line1: '', city: '', state: '', pinCode: '', country: 'India' };
const profileForm = user => ({
  name: user?.name || '',
  email: user?.email || '',
  phone: String(user?.phone || '').replace(/\D/g, '').slice(-10),
  address: { ...emptyAddress, ...user?.address, phone: String(user?.address?.phone || '').replace(/\D/g, '').slice(-10) }
});

export default function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const [form, setForm] = useState(() => profileForm(user));
  const [savedForm, setSavedForm] = useState(() => profileForm(user));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const hasChanges = JSON.stringify(form) !== JSON.stringify(savedForm);

  useLayoutEffect(() => {
    const cards = document.querySelectorAll('.account-layout .profile-mobile-card');
    const syncCardState = () => {
      const desktop = window.matchMedia('(min-width: 701px)').matches;
      cards.forEach(card => { card.open = desktop; });
    };
    syncCardState();
    window.addEventListener('resize', syncCardState);
    return () => window.removeEventListener('resize', syncCardState);
  }, []);

  const changeAddress = (key, value) => setForm(current => ({ ...current, address: { ...current.address, [key]: value } }));
  const edit = () => { setForm(savedForm); setError(''); setMessage(''); setEditing(true); };
  const submit = async event => {
    event.preventDefault();
    if (!editing || !hasChanges) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await updateProfile(form);
      setSavedForm(form);
      setMessage('Your account and delivery address are saved.');
      setEditing(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save your details.');
    } finally { setBusy(false); }
  };

  return <main className="shell page-main account-page">
    <div className="breadcrumbs"><Link to="/">Home</Link> / My account</div>
    <div className="account-heading"><span className="market-kicker">YOUR SHOPSTACK ACCOUNT</span><h1>Hello, {user?.name?.split(' ')[0] || 'there'}</h1><p>Keep your details and delivery addresses up to date for quicker checkout.</p></div>
    <div className="account-layout">
      <details className="profile-mobile-card profile-details-card">
        <summary>Account details</summary>
      <form className="account-form" onSubmit={submit}>
        <fieldset className="account-edit-fieldset" disabled={!editing}>
          <section><div className="account-section-title"><div><h2>Personal details</h2><p>These details are used for your orders.</p></div></div>
            <div className="account-fields">
              <label>Full name<input required maxLength="100" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))}/></label>
              <label>Email address<input type="email" required value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))}/></label>
              <label>Phone number<input type="tel" inputMode="numeric" autoComplete="tel" pattern="[0-9]{10}" maxLength={10} value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value.replace(/\D/g, '').slice(0, 10) }))}/><small>Optional; enter exactly 10 digits when provided.</small></label>
            </div>
          </section>
          <section><div className="account-section-title"><div><h2><MapPin/> Default delivery address</h2><p>Automatically filled in whenever you check out.</p></div></div>
            <div className="account-fields">
              <label>Recipient name<input value={form.address.fullName} onChange={event => changeAddress('fullName', event.target.value)}/></label>
              <label>Delivery phone<input type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.address.phone} onChange={event => changeAddress('phone', event.target.value.replace(/\D/g, '').slice(0, 10))}/><small>Optional; enter exactly 10 digits when provided.</small></label>
              <label className="wide-field">Street address<input autoComplete="street-address" value={form.address.line1} onChange={event => changeAddress('line1', event.target.value)}/></label>
              <label>City<input autoComplete="address-level2" value={form.address.city} onChange={event => changeAddress('city', event.target.value)}/></label>
              <label>State<input autoComplete="address-level1" value={form.address.state} onChange={event => changeAddress('state', event.target.value)}/></label>
              <label>PIN code<input inputMode="numeric" autoComplete="postal-code" value={form.address.pinCode} onChange={event => changeAddress('pinCode', event.target.value)}/></label>
              <label>Country<input value={form.address.country} onChange={event => changeAddress('country', event.target.value)}/></label>
            </div>
          </section>
        </fieldset>
        {error && <div className="notice error" role="alert">{error}</div>}
        {message && <div className="notice success" role="status">{message}</div>}
        {editing
          ? <button className="button account-save" type="submit" disabled={busy || !hasChanges}><Save size={17}/>{busy ? 'Saving account details...' : 'Save account details'}</button>
          : <button className="button account-save" type="button" onClick={edit}>Edit account details</button>}
      </form>
      </details>
      <aside className="account-sidebar"><WalletPanel/>
        <details className="profile-mobile-card account-quick-links"><summary>Quick links</summary><div className="profile-card-content"><Link to="/orders"><Package/><span><b>Your orders</b><small>Track delivery and payments</small></span></Link>{user?.role === 'admin' && <Link to="/admin"><ShieldCheck/><span><b>Admin dashboard</b><small>Manage ShopStack</small></span></Link>}<button type="button" onClick={logout}><LogOut/><span><b>Sign out</b><small>See you again soon</small></span></button></div></details>
        <details className="profile-mobile-card account-help"><summary>Need help with an order?</summary><div className="profile-card-content"><p>Our support team can help with deliveries, returns, and more.</p><Link to="/contact">Contact ShopStack support →</Link></div></details>
      </aside>
    </div>
  </main>;
}
