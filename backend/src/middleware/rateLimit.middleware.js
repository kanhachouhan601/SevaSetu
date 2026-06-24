const buckets = new Map();

const getClientKey = (req, scope) => {
  const userPart = req.user?._id ? `user:${req.user._id}` : `ip:${req.ip}`;
  return `${scope}:${userPart}`;
};

const rateLimit = ({ windowMs = 60_000, max = 60, scope = 'global' } = {}) => (req, res, next) => {
  const now = Date.now();
  const key = getClientKey(req, scope);
  const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  res.setHeader('X-RateLimit-Limit', String(max));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > max) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please wait and try again.',
      code: 'RATE_LIMITED',
      requestId: req.requestId,
    });
  }

  next();
};

module.exports = { rateLimit };
