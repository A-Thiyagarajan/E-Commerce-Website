
import 'dotenv/config';
import 'express-async-errors';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { connectDB } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import contactRoutes from './routes/contactRoutes.js';

const app = express();
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const productImageRoots = [
  process.env.PRODUCT_IMAGES_DIR && resolve(process.env.PRODUCT_IMAGES_DIR),
  resolve(repositoryRoot, 'frontend/public/product-images'),
  resolve(repositoryRoot, 'images')
].filter(Boolean);
const productImagesDirectory = productImageRoots.find(path => existsSync(path));

// ==========================================
// CORS CONFIGURATION
// ==========================================

const allowedOrigins = [
  'http://localhost:5173',
  'https://e-commerce-website-one-chi-35.vercel.app',
  'https://e-commerce-website-git-main-thiyagarajans-projects-914d713b.vercel.app',
  ...(process.env.CLIENT_URL || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
];

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // such as direct server-to-server requests.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(express.json({ limit: '1mb' }));

// ==========================================
// ERROR LOGGING
// ==========================================

const redactMongoUri = (value) =>
  String(value || '').replace(
    /mongodb(?:\+srv)?:\/\/[^\s'"<>]+/gi,
    '[MongoDB connection URI redacted]'
  );

const logBackendError = (label, err) => {
  console.error(
    `${label} ${err.name || 'Error'}${err.code ? ` (${err.code})` : ''}: ${redactMongoUri(err.message)}`
  );

  for (const [host, server] of err.reason?.servers || []) {
    if (server.error) {
      console.error(
        `[database] ${host}: ${server.error.name || 'Error'}${server.error.code ? ` (${server.error.code})` : ''}: ${redactMongoUri(server.error.message)}`
      );
    }
  }
};

// ==========================================
// AUTH ROUTES
// ==========================================

app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100
  }),
  authRoutes
);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ShopStack API is running'
  });
});

// ==========================================
// PRODUCT, ORDER AND OTHER ROUTES
// ==========================================

app.use('/api/products', productRoutes);

app.use('/api/orders', orderRoutes);

app.use('/api/payments', paymentRoutes);

app.use(
  '/api/contact',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10
  }),
  contactRoutes
);

app.use('/api/admin', adminRoutes);

if (productImagesDirectory) {
  app.use('/product-images', express.static(productImagesDirectory, {
    dotfiles: 'deny',
    maxAge: '7d',
    immutable: true
  }));
} else {
  console.warn('Product image directory not found; /product-images will return 404.');
}

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      message: 'Origin not allowed by CORS'
    });
  }

  const databaseUnavailable = [
    'MongoServerSelectionError',
    'MongoNetworkError',
    'MongooseServerSelectionError'
  ].includes(err.name) ||
    [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET'
    ].includes(err.code);

  if (databaseUnavailable) {
    logBackendError('[database] MongoDB request failed:', err);

    return res.status(503).json({
      message: 'Unable to connect to the server. Please try again later.'
    });
  }

  if (err.name === 'ValidationError') {
    console.error('[request] Validation error:', err.message);

    return res.status(400).json({
      message: err.message
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      message: 'An account with this email already exists'
    });
  }

  const status = err.status || 500;

  if (status >= 500) {
    logBackendError('[server] Request failed:', err);

    return res.status(status).json({
      message: 'Unable to connect to the server. Please try again later.'
    });
  }

  return res.status(status).json({
    message: err.message || 'Request failed'
  });
});

// ==========================================
// START SERVER AND CONNECT DATABASE
// ==========================================

const port = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`ShopStack API listening on ${port}`);
      console.log('Allowed frontend origins:', allowedOrigins);
    });
  })
  .catch((err) => {
    logBackendError(
      '[startup] MongoDB connection failed; the API will not accept requests until MongoDB is reachable:',
      err
    );

    process.exit(1);
  });
