
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

// Import API routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// ========================================
// 1. DIRECTORY CONFIGURATION
// ========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ========================================
// 2. CORS CONFIGURATION
// ========================================

const normalizeOrigin = (url) =>
  url.trim().replace(/\/+$/, '');

const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://e-commerce-website-one-chi-35.vercel.app',
  'https://e-commerce-website-git-main-thiyagarajans-projects-914d713b.vercel.app',
  'https://e-commerce-website-1dm3itqrk-thiyagarajans-projects-914d713b.vercel.app',

  ...(process.env.CLIENT_URL || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean)
]);

const corsOptions = {
  origin: (origin, callback) => {
    const normalizedOrigin = origin
      ? normalizeOrigin(origin)
      : null;

    // Allow requests without an Origin header
    if (!origin || allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }

    console.error('[CORS] Blocked origin:', origin);

    return callback(new Error('Not allowed by CORS'));
  },

  credentials: true,

  methods: [
    'GET',
    'HEAD',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization'
  ]
};

app.use(cors(corsOptions));

// ========================================
// 3. SECURITY CONFIGURATION
// ========================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  })
);

// ========================================
// 4. BODY PARSING
// ========================================

app.use(express.json({
  limit: '10mb'
}));

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb'
  })
);

// ========================================
// 5. STATIC PRODUCT IMAGES
// ========================================

const productImagesDirectory = path.join(
  __dirname,
  'product-images'
);

app.use(
  '/product-images',
  express.static(productImagesDirectory)
);

console.log(
  'Product images directory:',
  productImagesDirectory
);

// ========================================
// 6. HEALTH CHECK
// ========================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ShopStack backend is running',

    database:
      mongoose.connection.readyState === 1
        ? 'Connected'
        : 'Disconnected',

    timestamp: new Date().toISOString()
  });
});

// ========================================
// 7. API ROUTES
// ========================================

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// ========================================
// 8. 404 HANDLER
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// ========================================
// 9. GLOBAL ERROR HANDLER
// ========================================

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origin not allowed by CORS'
    });
  }

  if (
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.code === 'ECONNREFUSED'
  ) {
    return res.status(503).json({
      success: false,
      message: 'Unable to connect to the database. Please try again later.'
    });
  }

  return res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message
  });
});

// ========================================
// 10. MONGODB CONNECTION AND SERVER START
// ========================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        'MONGO_URI is missing from environment variables'
      );
    }

    if (!process.env.JWT_SECRET) {
      throw new Error(
        'JWT_SECRET is missing from environment variables'
      );
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected successfully');

    app.listen(PORT, () => {
      console.log(`ShopStack server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

startServer();
