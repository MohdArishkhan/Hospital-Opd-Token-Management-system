import rateLimit from 'express-rate-limit';

// right now for assignment purposes 
// we are not applying more middlewares but 
//in future we can add 2 more limiters named {authLimiter, uploadLimiter}
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true, 
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
    });
  },
});