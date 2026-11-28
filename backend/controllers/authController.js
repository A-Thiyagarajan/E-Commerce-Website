
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Generate JWT token
const tokenFor = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing from environment variables');
  }

  return jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Public user response
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || '',
  address: user.address || {},
  walletBalance: Number(user.walletBalance) || 0,
  walletReserved: Number(user.walletReserved) || 0,
  bankAccount: user.bankAccount || {},
  bankAccounts: user.bankAccounts || []
});

// Register user
export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    const normalizedName = String(name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (
      !normalizedName ||
      normalizedName.length > 100 ||
      !/^\S+@\S+\.\S+$/.test(normalizedEmail) ||
      typeof password !== 'string' ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: 'Provide a valid name, email, and password with at least 8 characters'
      });
    }

    const existingUser = await User.exists({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists'
      });
    }

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password
    });

    return res.status(201).json({
      token: tokenFor(user),
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account with this email already exists'
      });
    }

    return res.status(500).json({
      message: 'Registration failed. Please try again.'
    });
  }
}

// Login user
export async function login(req, res) {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();

    const password = req.body.password;

    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        message: 'Email or password is incorrect'
      });
    }

    return res.json({
      token: tokenFor(user),
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      message: 'Login failed. Please try again.'
    });
  }
}

// Get user profile
export async function profile(req, res) {
  if (!req.user) {
    return res.status(401).json({
      message: 'Authentication required'
    });
  }

  return res.json({
    user: publicUser(req.user)
  });
}

// Update user profile
export async function updateProfile(req, res) {
  try {
    const { name, email, phone, address } = req.body;

    if (
      name !== undefined &&
      (
        typeof name !== 'string' ||
        !name.trim() ||
        name.trim().length > 100
      )
    ) {
      return res.status(400).json({
        message: 'Enter a valid name'
      });
    }

    const normalizedEmail =
      email !== undefined
        ? String(email).trim().toLowerCase()
        : undefined;

    if (
      email !== undefined &&
      !/^\S+@\S+\.\S+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        message: 'Enter a valid email address'
      });
    }

    if (
      phone !== undefined &&
      String(phone).trim() &&
      !/^\d{10}$/.test(String(phone).trim())
    ) {
      return res.status(400).json({
        message: 'Phone number must contain exactly 10 digits'
      });
    }

    if (
      address?.phone !== undefined &&
      String(address.phone).trim() &&
      !/^\d{10}$/.test(String(address.phone).trim())
    ) {
      return res.status(400).json({
        message: 'Delivery phone must contain exactly 10 digits'
      });
    }

    if (
      normalizedEmail &&
      await User.exists({
        email: normalizedEmail,
        _id: { $ne: req.user._id }
      })
    ) {
      return res.status(409).json({
        message: 'That email address is already in use'
      });
    }

    const fields = {};

    if (name !== undefined) {
      fields.name = name.trim();
    }

    if (email !== undefined) {
      fields.email = normalizedEmail;
    }

    if (phone !== undefined) {
      fields.phone = String(phone).trim().slice(0, 30);
    }

    if (
      address &&
      typeof address === 'object' &&
      !Array.isArray(address)
    ) {
      const allowedAddressFields = [
        'fullName',
        'phone',
        'line1',
        'city',
        'state',
        'pinCode',
        'country'
      ];

      for (const key of allowedAddressFields) {
        if (address[key] !== undefined) {
          fields[`address.${key}`] = String(address[key])
            .trim()
            .slice(0, 150);
        }
      }
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({
        message: 'No valid profile fields provided'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: fields },
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    return res.json({
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Profile update error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'That email address is already in use'
      });
    }

    return res.status(500).json({
      message: 'Profile update failed. Please try again.'
    });
  }
}
