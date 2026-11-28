import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, RefreshCw, UserRound } from 'lucide-react';
import api, { errorText } from '../services/api';

const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

export default function ManageWallets() {
  const [users, setUsers] = useState([]), [withdrawals, setWithdrawals] = useState([]), [operation, setOperation] = useState({}), [amount, setAmount] = useState({}), [note, setNote] = useState({}), [busy, setBusy] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState(''), [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const [u, w] = await Promise.all([api.get('/admin/users'), api.get('/admin/wallet/withdrawals')]); setUsers(u.data.users || []); setWithdrawals(w.data.transactions || []); }
    catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer); }, [load]);
  const save = async user => {
    setError(''); setNotice(''); setBusy(user._id);
    try {
      const { data } = await api.patch(`/admin/users/${user._id}/wallet`, { operation: operation[user._id] || 'add', amount: amount[user._id], note: note[user._id] || 'Admin wallet adjustment' });
      setUsers(rows => rows.map(row => row._id === user._id ? { ...row, walletBalance: data.balance, availableBalance: data.availableBalance, walletReserved: data.reserved } : row));
      setNotice(`${user.name}'s wallet is now ${money(data.availableBalance)} available.`); setAmount(old => ({ ...old, [user._id]: '' })); setNote(old => ({ ...old, [user._id]: '' }));
    } catch (e) { setError(e.response?.data?.message || errorText(e)); }
    finally { setBusy(''); }
  };
  const resolve = async (withdrawal, status) => {
    setError(''); setNotice(''); setBusy(withdrawal._id);
    try { await api.patch(`/admin/wallet/withdrawals/${withdrawal._id}`, { status }); await load(); setNotice(status === 'Completed' ? 'Withdrawal marked as paid.' : 'Withdrawal rejected; funds were returned to the wallet.'); }
    catch (e) { setError(e.response?.data?.message || errorText(e)); }
    finally { setBusy(''); }
  };

  return <main className="shell page-main admin-wallet-page">
    <div className="breadcrumbs"><Link to="/admin">Admin</Link> / Wallets</div>
    <header className="admin-wallet-heading"><div><span className="market-kicker">CUSTOMER BALANCES</span><h1>User <em>wallets</em></h1><p>Review balances and make audited adjustments.</p></div><button className="admin-orders-refresh" type="button" onClick={load} disabled={loading}><RefreshCw size={15}/>{loading ? 'Refreshing...' : 'Refresh'}</button></header>
    {error && <div className="notice error" role="alert">{error}</div>}{notice && <div className="notice success" role="status">{notice}</div>}
    {loading && !users.length ? <div className="empty-state">Loading customer wallets...</div> : users.length ? <section className="admin-wallet-grid" aria-label="Customer wallets">{users.map(user => <article className="admin-user-wallet" key={user._id}>
      <header><span className="admin-user-avatar"><UserRound size={18}/></span><span><b>{user.name}</b><small>{user.email}</small></span></header>
      <div className="admin-user-balance"><Wallet size={17}/><span>Available balance</span><strong>{money(user.availableBalance)}</strong></div>{user.walletReserved>0&&<small className="admin-wallet-reserved">{money(user.walletReserved)} reserved for an online payment in progress</small>}
      <label>Adjustment<select value={operation[user._id] || 'add'} onChange={e => setOperation(old => ({ ...old, [user._id]: e.target.value }))}><option value="add">Add funds</option><option value="subtract">Subtract funds</option><option value="set">Set balance to</option></select></label>
      <label>{operation[user._id] === 'set' ? 'New available balance (₹)' : 'Amount (₹)'}<input type="number" min="0" step="0.01" value={amount[user._id] ?? ''} onChange={e => setAmount(old => ({ ...old, [user._id]: e.target.value }))} placeholder="0.00"/></label>
      <label>Reason<input maxLength="240" value={note[user._id] || ''} onChange={e => setNote(old => ({ ...old, [user._id]: e.target.value }))} placeholder="Admin wallet adjustment"/></label>
      <button className="button" disabled={busy === user._id || amount[user._id] === undefined || amount[user._id] === ''} onClick={() => save(user)}>{busy === user._id ? 'Saving...' : 'Update wallet'}</button>
    </article>)}</section> : !error && <div className="empty-state">No customer accounts yet.</div>}
    <section className="admin-wallet-withdrawals"><h2>Withdrawal requests</h2><p>Accept a request to debit the wallet and approve the withdrawal. Rejecting leaves the customer wallet unchanged.</p>{withdrawals.filter(w => w.status === 'Pending').length ? withdrawals.filter(w => w.status === 'Pending').map(w => { const bank = w.bankAccount || w.user?.bankAccount || {}; return <article className="admin-wallet-request" key={w._id}><div><b>{w.user?.name || 'Customer'} · {money(w.amount)}</b><span>{w.user?.email} · {bank.accountHolder} · A/C {bank.accountNumber} · IFSC {bank.ifsc}</span><small>{w.note}</small></div><button className="button" disabled={busy === w._id} onClick={() => resolve(w, 'Completed')}>Accept withdrawal</button><button className="button button-secondary" disabled={busy === w._id} onClick={() => resolve(w, 'Rejected')}>Reject</button></article>; }) : <div className="empty-state">No pending withdrawal requests.</div>}</section>
  </main>;
}
