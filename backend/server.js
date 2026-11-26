import 'dotenv/config';
import 'express-async-errors';
import express from 'express'; import cors from 'cors'; import helmet from 'helmet'; import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js'; import productRoutes from './routes/productRoutes.js'; import orderRoutes from './routes/orderRoutes.js'; import adminRoutes from './routes/adminRoutes.js'; import paymentRoutes from './routes/paymentRoutes.js'; import contactRoutes from './routes/contactRoutes.js';
const app = express();
const redactMongoUri = (value) => String(value || '').replace(/mongodb(?:\+srv)?:\/\/[^\s'"<>]+/gi, '[MongoDB connection URI redacted]');
const logBackendError = (label, err) => {
  console.error(`${label} ${err.name || 'Error'}${err.code ? ` (${err.code})` : ''}: ${redactMongoUri(err.message)}`);
  for (const [host, server] of err.reason?.servers || []) {
    if (server.error) console.error(`[database] ${host}: ${server.error.name || 'Error'}${server.error.code ? ` (${server.error.code})` : ''}: ${redactMongoUri(server.error.message)}`);
  }
};
app.use(helmet()); app.use(cors({ origin: process.env.CLIENT_URL?.split(',').map((v) => v.trim()) || 'http://localhost:5173' })); app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), authRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' })); app.use('/api/products', productRoutes); app.use('/api/orders', orderRoutes); app.use('/api/payments',paymentRoutes); app.use('/api/contact',rateLimit({windowMs:60*60*1000,limit:10}),contactRoutes); app.use('/api/admin', adminRoutes);
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  const databaseUnavailable = [
    'MongoServerSelectionError',
    'MongoNetworkError',
    'MongooseServerSelectionError'
  ].includes(err.name) || ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'].includes(err.code);

  if (databaseUnavailable) {
    logBackendError('[database] MongoDB request failed:', err);
    return res.status(503).json({ message: 'Unable to connect to the server. Please try again later.' });
  }

  if (err.name === 'ValidationError') {
    console.error('[request] Validation error:', err.message);
    return res.status(400).json({ message: err.message });
  }
  if (err.code === 11000) return res.status(409).json({ message: 'An account with this email already exists' });

  const status = err.status || 500;
  if (status >= 500) {
    logBackendError('[server] Request failed:', err);
    return res.status(status).json({ message: 'Unable to connect to the server. Please try again later.' });
  }
  return res.status(status).json({ message: err.message || 'Request failed' });
});
const port = process.env.PORT || 5000;
connectDB().then(() => app.listen(port, () => console.log(`ShopStack API listening on ${port}`))).catch((err) => {
  logBackendError('[startup] MongoDB connection failed; the API will not accept requests until MongoDB is reachable:', err);
  process.exit(1);
});
