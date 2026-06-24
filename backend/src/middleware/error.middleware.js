const { createRequestId, sanitizeForLog } = require('../utils/security');

const requestContext = (req, res, next) => {
  req.requestId = req.headers['x-request-id'] || createRequestId();
  res.setHeader('X-Request-Id', req.requestId);
  next();
};

const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
};

const requestLogger = (req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    const payload = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      userId: req.user?._id,
      role: req.user?.role,
      ip: req.ip,
    };
    console[level]('[Request]', sanitizeForLog(payload));
  });
  next();
};

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    code: 'NOT_FOUND',
    requestId: req.requestId,
  });
};

const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = status >= 500 ? 'Internal server error.' : err.message;

  console.error('[Server Error]', sanitizeForLog({
    requestId: req.requestId,
    status,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  }));

  res.status(status).json({
    success: false,
    error: message,
    code: err.code || 'SERVER_ERROR',
    details: err.details,
    requestId: req.requestId,
  });
};

module.exports = {
  errorHandler,
  notFound,
  requestContext,
  requestLogger,
  securityHeaders,
};
