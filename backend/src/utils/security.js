const crypto = require('crypto');

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'jwt',
  'secret',
  'apiKey',
  'api_key',
  'GMAIL_PASS',
  'MONGODB_URI',
  'JWT_SECRET',
]);

const maskEmail = (value = '') => {
  const [name, domain] = String(value).split('@');
  if (!domain) return value;
  return `${name.slice(0, 2)}***@${domain}`;
};

const maskPhone = (value = '') => {
  const text = String(value);
  if (text.length <= 4) return '****';
  return `${'*'.repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`;
};

const maskValue = (key, value) => {
  const lowerKey = String(key || '').toLowerCase();
  if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(lowerKey)) return '[REDACTED]';
  if (lowerKey.includes('email') && typeof value === 'string') return maskEmail(value);
  if (lowerKey.includes('phone') && typeof value === 'string') return maskPhone(value);
  if (lowerKey.includes('address') && typeof value === 'string') return '[REDACTED_ADDRESS]';
  if (lowerKey.includes('problem') && typeof value === 'string') return '[REDACTED_HEALTH_TEXT]';
  return value;
};

const sanitizeForLog = (input) => {
  if (Array.isArray(input)) return input.map(sanitizeForLog);
  if (!input || typeof input !== 'object') return input;

  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value && typeof value === 'object') {
      acc[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : sanitizeForLog(value);
    } else {
      acc[key] = maskValue(key, value);
    }
    return acc;
  }, {});
};

const createRequestId = () => crypto.randomBytes(8).toString('hex');

module.exports = {
  createRequestId,
  maskEmail,
  maskPhone,
  sanitizeForLog,
};
