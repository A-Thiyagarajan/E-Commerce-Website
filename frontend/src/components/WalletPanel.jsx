import { useCallback, useEffect, useState } from 'react';
import { Banknote, Wallet as WalletIcon } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);
const emptyBank = () => ({ accountHolder: '', accountNumber: '', ifsc: '' });

export default function WalletPanel() {
  const { user } = useAuth();
  const activityCacheKey = `shopstack-wallet-activity-${user?.id || 'user'}`;
  const cachedActivity = (() => { try { return JSON.parse(sessionStorage.getItem(activityCacheKey) || 'null'); } catch { return null; } })();
  const [data, setData] = useState(() => ({ balance: Number(user?.walletBalance) || 0, availableBalance: Math.max(0, (Number(user?.walletBalance) || 0) - (Number(user?.walletReserved) || 0)), reserved: Number(user?.walletReserved) || 0, bankAccount: user?.bankAccount || {}, bankAccounts: user?.bankAccounts || [], transactions: Array.isArray(cachedActivity) ? cachedActivity : [] }));
  const [bankAccounts, setBankAccounts] = useState(user?.bankAccounts || []);
  const [selectedBankId, setSelectedBankId] = useState(user?.bankAccounts?.[0]?._id || '');
  const [bank, setBank] = useState(emptyBank);
  const [savedBank, setSavedBank] = useState(emptyBank);
  const [editingBankId, setEditingBankId] = useState('');
  const [bankEditing, setBankEditing] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(Array.isArray(cachedActivity));
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const bankHasChanges = JSON.stringify(bank) !== JSON.stringify(savedBank);
  const load = useCallback(async () => {
    const { data: result } = await api.get('/wallet');
    setData(result);
    sessionStorage.setItem(activityCacheKey, JSON.stringify(result.transactions || []));
    setActivityLoaded(true);
    const accounts = result.bankAccounts || [];
    setBankAccounts(accounts);
    setSelectedBankId(current => accounts.some(account => String(account._id) === current) ? current : (accounts[0]?._id || ''));
    return result;
  }, [activityCacheKey]);
  useEffect(() => {
    let mounted = true;
    const initialLoad = () => load().catch(e => { if (mounted) { setActivityLoaded(true); setError(e.response?.data?.message || 'Could not load wallet.'); } });
    const refresh = () => load().catch(e => setError(e.response?.data?.message || 'Could not load wallet.'));
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    initialLoad();
    const timer = setInterval(refresh, 30000);
    window.addEventListener('shopstack-wallet-updated', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => { mounted = false; clearInterval(timer); window.removeEventListener('shopstack-wallet-updated', refresh); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);

  const startAddBank = () => { setBank(emptyBank()); setSavedBank(emptyBank()); setEditingBankId(''); setBankEditing(true); setError(''); setNotice(''); };
  const startEditBank = account => {
    const values = { accountHolder: account.accountHolder || '', accountNumber: account.accountNumber || '', ifsc: account.ifsc || '' };
    setBank(values); setSavedBank(values); setEditingBankId(String(account._id)); setBankEditing(true); setError(''); setNotice('');
  };
  const cancelBankEdit = () => { setBank(emptyBank()); setSavedBank(emptyBank()); setEditingBankId(''); setBankEditing(false); };
  const saveBank = async e => {
    e.preventDefault();
    if (!bankHasChanges) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = editingBankId
        ? await api.patch(`/wallet/bank-accounts/${editingBankId}`, bank)
        : await api.post('/wallet/bank-accounts', bank);
      const accounts = response.data.bankAccounts || [];
      setBankAccounts(accounts);
      const saved = editingBankId ? accounts.find(account => String(account._id) === editingBankId) : accounts[accounts.length - 1];
      if (saved) setSelectedBankId(String(saved._id));
      setBankEditing(false); setEditingBankId(''); setBank(emptyBank()); setSavedBank(emptyBank());
      setNotice(editingBankId ? 'Bank account updated.' : 'Bank account added.');
      await load();
    } catch (e) { setError(e.response?.data?.message || 'Could not save bank account.'); }
    finally { setBusy(false); }
  };
  const removeBank = async account => {
    if (!window.confirm(`Remove bank account ending ${account.accountNumber.slice(-4)}?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data: result } = await api.delete(`/wallet/bank-accounts/${account._id}`);
      setBankAccounts(result.bankAccounts || []);
      if (selectedBankId === String(account._id)) setSelectedBankId(result.bankAccounts?.[0]?._id || '');
      setNotice('Bank account removed.');
    } catch (e) { setError(e.response?.data?.message || 'Could not remove bank account.'); }
    finally { setBusy(false); }
  };
  const withdraw = async e => {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await api.post('/wallet/withdrawals', { amount, bankAccountId: selectedBankId }); setAmount(''); setNotice('Withdrawal request submitted. It will be processed by the store.'); await load(); }
    catch (e) { setError(e.response?.data?.message || 'Could not request withdrawal.'); }
    finally { setBusy(false); }
  };

  return <details className="wallet-panel profile-mobile-card" id="wallet"><summary>Wallet account</summary><div className="wallet-panel-content">
    <div className="wallet-balance"><WalletIcon/><div><span>Available wallet balance</span><strong>{money(data.availableBalance)}</strong></div></div>
    {data.reserved > 0 && <p className="wallet-reserved-note">{money(data.reserved)} is reserved for a payment in progress.</p>}
    {error && <div className="notice error">{error}</div>}{notice && <div className="notice success">{notice}</div>}
    <section className="wallet-bank-form">
      <h3><Banknote size={17}/> Bank accounts for withdrawals</h3>
      {bankAccounts.length > 0 && <div className="wallet-bank-account-list">{bankAccounts.map(account => <div className={`wallet-bank-account ${selectedBankId === String(account._id) ? 'selected' : ''}`} key={account._id}>
        <label><input type="radio" name="withdrawal-bank" value={account._id} checked={selectedBankId === String(account._id)} onChange={() => setSelectedBankId(String(account._id))}/><span><b>{account.accountHolder}</b><small>A/C ending {account.accountNumber.slice(-4)} · IFSC {account.ifsc}</small></span></label>
        <div className="wallet-bank-actions"><button type="button" onClick={() => startEditBank(account)}>Edit</button><button type="button" disabled={busy} onClick={() => removeBank(account)}>Remove</button></div>
      </div>)}</div>}
      {!bankEditing ? <button className="button" type="button" onClick={startAddBank}>Add bank account</button> : <form onSubmit={saveBank}>
        <div className="account-fields"><label>Account holder<input required maxLength="100" autoComplete="name" value={bank.accountHolder} onChange={e => setBank(current => ({ ...current, accountHolder: e.target.value }))}/></label><label>Account number<input required inputMode="numeric" autoComplete="off" value={bank.accountNumber} onChange={e => setBank(current => ({ ...current, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 34) }))}/></label><label>IFSC code<input required maxLength="11" autoComplete="off" value={bank.ifsc} onChange={e => setBank(current => ({ ...current, ifsc: e.target.value.toUpperCase().slice(0, 11) }))}/></label></div>
        <div className="wallet-bank-actions"><button className="button" type="submit" disabled={busy || !bankHasChanges}>{busy ? 'Saving bank details...' : editingBankId ? 'Save bank details' : 'Add bank account'}</button><button className="button button-secondary" type="button" disabled={busy} onClick={cancelBankEdit}>Cancel</button></div>
      </form>}
    </section>
    <form className="wallet-withdraw-form" onSubmit={withdraw}><label>Withdraw amount (₹)<input type="number" min="0.01" max={data.availableBalance} step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}/></label>
      <div className="wallet-withdraw-actions"><button className="button" type="button" disabled={!data.availableBalance} onClick={() => setAmount(String(data.availableBalance))}>Use full balance</button><button className="button" disabled={busy || !selectedBankId || !data.availableBalance}>Withdraw amount</button></div><small>Requests are sent to the store for bank transfer processing.</small>
    </form>
    <div className="wallet-history"><h3>Recent wallet activity</h3>{data.transactions.length ? data.transactions.map(t => { const pending = t.type === 'withdrawal' && t.status === 'Pending'; const rejected = t.type === 'withdrawal' && t.status === 'Rejected'; const debit = t.type === 'debit' || (t.type === 'withdrawal' && t.status === 'Completed'); return <div className="wallet-transaction" key={t._id}><span><b>{t.note}</b><small>{new Date(t.createdAt).toLocaleDateString('en-IN')} · {t.status}</small></span><strong className={debit ? 'wallet-negative' : pending || rejected ? 'wallet-neutral' : ''}>{pending ? 'Pending · ' : rejected ? 'Rejected · ' : debit ? '−' : '+'}{money(t.amount)}</strong></div>; }) : <p>{activityLoaded ? 'No wallet activity yet.' : 'Loading recent activity…'}</p>}</div>
  </div></details>;
}
