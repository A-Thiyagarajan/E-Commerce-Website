import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function protect(req, res, next) {
  try {
    // Check JWT secret configuration
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing from environment variables');

      return res.status(500).json({
        message: 'Server authentication configuration error'
      });
    }

    // Read token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        message: 'Authentication token is missing'
      });
    }

    // Verify JWT token
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload.id) {
      return res.status(401).json({
        message: 'Invalid authentication token'
      });
    }

    // Find user without exposing password
    const user = await User.findById(payload.id).select('-password');

    if (!user) {
      return res.status(401).json({
        message: 'Account no longer exists'
      });
    }

    // Attach authenticated user
    req.user = user;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Invalid or expired session'
      });
    }

    console.error('Authentication middleware error:', error);

    return res.status(500).json({
      message: 'Authentication failed due to a server error'
    });
  }
}