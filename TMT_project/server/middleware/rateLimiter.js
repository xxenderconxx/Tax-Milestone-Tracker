const rateLimit = require('express-rate-limit');

// General protection for authentication endpoints.
// This is IP-based and acts as the first layer.
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error: 'Too many authentication requests. Please try again later.'
  },

  skip: (req) => {
    // We handle failed-login limits separately below.
    return req.path === '/login';
  }
});

// Login-specific limiter.
// Limits repeated attempts from the same IP.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error: 'Too many login attempts. Please try again later.'
  }
});

// Password reset / invite protection.
const sensitiveAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error: 'Too many requests. Please try again later.'
  }
});

module.exports = {
  authRateLimiter,
  loginRateLimiter,
  sensitiveAuthRateLimiter
};