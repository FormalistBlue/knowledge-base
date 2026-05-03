import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const keyForLoginAttempt = (req: Request) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : 'unknown';
  return `${ipKeyGenerator(req.ip ?? 'unknown')}:${username}`;
};

// The in-memory store is enough for the current single-container deployment; use a shared store before horizontal scaling.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: keyForLoginAttempt,
  message: {
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: '登录失败次数过多，请 15 分钟后再试',
    details: null,
  },
  skipSuccessfulRequests: true,
});
