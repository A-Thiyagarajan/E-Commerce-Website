import jwt from 'jsonwebtoken';
import User from '../models/User.js';
const tokenFor = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone || '', address: user.address || {} });
export async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || !password || password.length < 8) return res.status(400).json({ message: 'Provide a name, valid email, and password with at least 8 characters' });
  if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account with this email already exists' });
  const user = await User.create({ name, email, password });
  res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
}
export async function login(req, res) {
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(req.body.password || ''))) return res.status(401).json({ message: 'Email or password is incorrect' });
  res.json({ token: tokenFor(user), user: publicUser(user) });
}
export async function profile(req, res) { res.json({ user: publicUser(req.user) }); }
export async function updateProfile(req, res) {
  const { name, email, phone, address } = req.body;
  if (name !== undefined && (!String(name).trim() || String(name).length > 100)) return res.status(400).json({ message: 'Enter a valid name' });
  if (email !== undefined && !/^\S+@\S+\.\S+$/.test(String(email))) return res.status(400).json({ message: 'Enter a valid email address' });
  if (phone !== undefined && String(phone).trim() && !/^\d{10}$/.test(String(phone).trim())) return res.status(400).json({ message: 'Phone number must contain exactly 10 digits' });
  if (address?.phone !== undefined && String(address.phone).trim() && !/^\d{10}$/.test(String(address.phone).trim())) return res.status(400).json({ message: 'Delivery phone must contain exactly 10 digits' });
  if (email && await User.exists({ email: String(email).toLowerCase(), _id: { $ne: req.user._id } })) return res.status(409).json({ message: 'That email address is already in use' });
  const fields = {};
  if (name !== undefined) fields.name = String(name).trim();
  if (email !== undefined) fields.email = String(email).trim().toLowerCase();
  if (phone !== undefined) fields.phone = String(phone).trim().slice(0,30);
  if (address && typeof address === 'object') {
    for (const key of ['fullName','phone','line1','city','state','pinCode','country']) if (address[key] !== undefined) fields[`address.${key}`] = String(address[key]).trim().slice(0,150);
  }
  const user = await User.findByIdAndUpdate(req.user._id, { $set: fields }, { new: true, runValidators: true });
  res.json({ user: publicUser(user) });
}
