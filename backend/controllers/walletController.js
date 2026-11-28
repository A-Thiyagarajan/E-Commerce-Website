import mongoose from 'mongoose';
import User from '../models/User.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { releaseExpiredWalletReservations } from '../utils/walletReservations.js';
import { reconcileLegacyWalletOrders, reconcileCancelledOrderRefunds } from '../utils/walletReconciliation.js';

async function restoreLegacyPendingWithdrawals(userId) {
  const query = { type: 'withdrawal', status: 'Pending', balanceDebited: { $in: [null] } };
  if (userId) query.user = userId;
  const legacy = await WalletTransaction.find(query).select('_id user amount').lean();
  for (const row of legacy) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const transaction = await WalletTransaction.findOne({ _id: row._id, status: 'Pending', type: 'withdrawal', balanceDebited: { $in: [null] } }).session(session);
        if (!transaction) return;
        await User.updateOne({ _id: transaction.user }, { $inc: { walletBalance: transaction.amount } }, { session });
        transaction.balanceDebited = false;
        await transaction.save({ session });
      });
    } finally { await session.endSession(); }
  }
}

export async function wallet(req, res) {
  await releaseExpiredWalletReservations(req.user._id);
  await reconcileLegacyWalletOrders(req.user._id);
  await reconcileCancelledOrderRefunds(req.user._id);
  await restoreLegacyPendingWithdrawals(req.user._id);
  const user = await User.findById(req.user._id).select('walletBalance walletReserved bankAccount bankAccounts');
  if (user && !user.bankAccounts.length && user.bankAccount?.accountNumber) {
    user.bankAccounts.push(user.bankAccount);
    user.bankAccount = { accountHolder: '', accountNumber: '', ifsc: '' };
    await user.save();
  }
  const transactions = await WalletTransaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
  const balance = user?.walletBalance || 0, reserved = user?.walletReserved || 0;
  res.json({ balance, reserved, availableBalance: Math.max(0, balance - reserved), bankAccount: user?.bankAccount || {}, bankAccounts: user?.bankAccounts || [], transactions });
}

function validBankAccount(body) {
  const { accountHolder, accountNumber, ifsc } = body;
  if (![accountHolder, accountNumber, ifsc].every(value => typeof value === 'string' && value.trim())) return { error: 'Enter the account holder name, account number, and IFSC code.' };
  const account = {
    accountHolder: accountHolder.trim().replace(/\s+/g, ' '),
    accountNumber: accountNumber.replace(/\D/g, ''),
    ifsc: ifsc.trim().replace(/\s+/g, '').toUpperCase()
  };
  if (account.accountHolder.length > 100 || !/^[0-9]{6,34}$/.test(account.accountNumber) || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(account.ifsc)) return { error: 'Check the account number and IFSC. Use a 6–34 digit account number and an 11-character IFSC.' };
  return { account };
}

export async function addBankAccount(req, res) {
  const { account, error } = validBankAccount(req.body);
  if (error) return res.status(400).json({ message: error });
  const user = await User.findById(req.user._id).select('bankAccount bankAccounts');
  if (!user) return res.status(404).json({ message: 'Account not found.' });
  if (!user.bankAccounts.length && user.bankAccount?.accountNumber) {
    user.bankAccounts.push(user.bankAccount);
    user.bankAccount = { accountHolder: '', accountNumber: '', ifsc: '' };
  }
  if (user.bankAccounts.some(saved => saved.accountNumber === account.accountNumber)) return res.status(409).json({ message: 'This bank account is already saved.' });
  user.bankAccounts.push(account);
  await user.save();
  res.status(201).json({ bankAccounts: user.bankAccounts });
}

export async function updateBankAccount(req, res) {
  const { account, error } = validBankAccount(req.body);
  if (error) return res.status(400).json({ message: error });
  const user = await User.findById(req.user._id).select('bankAccounts');
  const saved = user?.bankAccounts.id(req.params.id);
  if (!saved) return res.status(404).json({ message: 'Saved bank account not found.' });
  if (user.bankAccounts.some(item => String(item._id) !== req.params.id && item.accountNumber === account.accountNumber)) return res.status(409).json({ message: 'This bank account is already saved.' });
  Object.assign(saved, account);
  await user.save();
  res.json({ bankAccounts: user.bankAccounts });
}

export async function deleteBankAccount(req, res) {
  const user = await User.findById(req.user._id).select('bankAccounts');
  if (!user?.bankAccounts.id(req.params.id)) return res.status(404).json({ message: 'Saved bank account not found.' });
  user.bankAccounts.pull(req.params.id);
  await user.save();
  res.json({ bankAccounts: user.bankAccounts });
}

export async function saveBankAccount(req, res) {
  // Keep the old endpoint working for clients that still save a single account.
  const { accountHolder, accountNumber, ifsc } = req.body;
  if (![accountHolder, accountNumber, ifsc].every(value => typeof value === 'string' && value.trim())) return res.status(400).json({ message: 'Enter the account holder name, account number, and IFSC code.' });
  const cleanHolder = accountHolder.trim().replace(/\s+/g, ' ');
  const cleanAccount = accountNumber.replace(/\D/g, '');
  const cleanIfsc = ifsc.trim().replace(/\s+/g, '').toUpperCase();
  if (cleanHolder.length > 100 || !/^[0-9]{6,34}$/.test(cleanAccount) || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) return res.status(400).json({ message: 'Check the account number and IFSC. Use a 6–34 digit account number and an 11-character IFSC.' });
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { 'bankAccount.accountHolder': cleanHolder, 'bankAccount.accountNumber': cleanAccount, 'bankAccount.ifsc': cleanIfsc } }, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ message: 'Account not found.' });
  res.json({ bankAccount: user.bankAccount });
}

export async function requestWithdrawal(req, res) {
  await restoreLegacyPendingWithdrawals(req.user._id);
  const amount = Math.round(Number(req.body.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Enter a valid withdrawal amount.' });
  const session = await mongoose.startSession();
  try {
    let transaction;
    await session.withTransaction(async () => {
      const user = await User.findById(req.user._id).select('walletBalance walletReserved bankAccount bankAccounts').session(session);
      if (user && !user.bankAccounts.length && user.bankAccount?.accountNumber) {
        user.bankAccounts.push(user.bankAccount);
        user.bankAccount = { accountHolder: '', accountNumber: '', ifsc: '' };
        await user.save({ session });
      }
      const selectedBank = user?.bankAccounts.id(String(req.body.bankAccountId || ''));
      if (!selectedBank) throw Object.assign(new Error('Choose a saved bank account for this withdrawal.'), { status: 409 });
      const pending = await WalletTransaction.aggregate([{ $match: { user: user._id, type: 'withdrawal', status: 'Pending' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).session(session);
      const available = (user.walletBalance || 0) - (user.walletReserved || 0) - (pending[0]?.total || 0);
      if (amount > available) throw Object.assign(new Error('Your wallet does not have enough unrequested funds for this withdrawal.'), { status: 409 });
      const bankAccount = { accountHolder: selectedBank.accountHolder, accountNumber: selectedBank.accountNumber, ifsc: selectedBank.ifsc };
      [transaction] = await WalletTransaction.create([{ user: user._id, type: 'withdrawal', amount, bankAccount, note: `Withdrawal to bank account ending ${selectedBank.accountNumber.slice(-4)}`, status: 'Pending', balanceDebited: false }], { session });
    });
    res.status(201).json({ transaction });
  } finally { await session.endSession(); }
}

export async function adminCreditWallet(req, res) {
  const { amount, note = 'Added by admin' } = req.body;
  const value = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(value) || value <= 0 || value > 1000000) return res.status(400).json({ message: 'Enter a valid amount.' });
  const user = await User.findByIdAndUpdate(req.params.id, { $inc: { walletBalance: value } }, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  const transaction = await WalletTransaction.create({ user: user._id, type: 'credit', amount: value, note: String(note).slice(0, 240) });
  res.status(201).json({ balance: user.walletBalance, transaction });
}

export async function listWithdrawals(req, res) {
  await restoreLegacyPendingWithdrawals();
  const transactions = await WalletTransaction.find({ type: 'withdrawal' }).populate('user', 'name email bankAccount').sort({ createdAt: -1 }).limit(200).lean();
  res.json({ transactions });
}

export async function resolveWithdrawal(req, res) {
  await restoreLegacyPendingWithdrawals();
  if (!['Completed', 'Rejected'].includes(req.body.status)) return res.status(400).json({ message: 'Choose Completed or Rejected.' });
  const session = await mongoose.startSession();
  try {
    let transaction;
    await session.withTransaction(async () => {
      transaction = await WalletTransaction.findOne({ _id: req.params.id, type: 'withdrawal', status: 'Pending' }).session(session);
      if (!transaction) return;
      if (req.body.status === 'Completed' && transaction.balanceDebited !== true) {
        const debit = await User.updateOne({ _id: transaction.user, $expr: { $gte: [{ $subtract: [{ $ifNull: ['$walletBalance', 0] }, { $ifNull: ['$walletReserved', 0] }] }, transaction.amount] } }, { $inc: { walletBalance: -transaction.amount } }, { session });
        if (debit.modifiedCount !== 1) throw Object.assign(new Error('The customer no longer has enough available wallet funds to accept this request.'), { status: 409 });
        transaction.balanceDebited = true;
      } else if (req.body.status === 'Rejected' && transaction.balanceDebited === true) {
        await User.updateOne({ _id: transaction.user }, { $inc: { walletBalance: transaction.amount } }, { session });
        transaction.balanceDebited = false;
      }
      transaction.status = req.body.status;
      await transaction.save({ session });
    });
    if (!transaction) return res.status(404).json({ message: 'Pending withdrawal not found.' });
    res.json({ transaction });
  } finally { await session.endSession(); }
}
