const REQUIRED_PRODUCTION_ENV = ['MONGODB_URI', 'JWT_SECRET', 'FRONTEND_URL'];
const PLACEHOLDER_VALUES = new Set([
  'replace-with-at-least-32-random-characters',
  'changeme',
  'change-me',
  'secret',
  'password',
]);

const isPlaceholder = (value = '') => PLACEHOLDER_VALUES.has(String(value).trim().toLowerCase());

const parseAllowedOrigins = () => {
  const origins = [
    process.env.FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS || '').split(','),
  ];

  return [...new Set(origins.map(origin => origin && origin.trim()).filter(Boolean))];
};

const validateEnv = () => {
  const env = process.env.NODE_ENV || 'development';
  const missing = [];

  if (env === 'production') {
    for (const key of REQUIRED_PRODUCTION_ENV) {
      if (!process.env[key]) missing.push(key);
    }
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('[Config] JWT_SECRET should be at least 32 characters in production.');
  }

  if (env === 'production') {
    if (isPlaceholder(process.env.JWT_SECRET)) {
      throw new Error('JWT_SECRET must be changed from the placeholder value before production deploy.');
    }

    if ((process.env.JWT_SECRET || '').length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production.');
    }

    if (!parseAllowedOrigins().length) {
      throw new Error('At least one frontend origin is required in production.');
    }
  }

  if (missing.length) {
    throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  }

  if (!process.env.MONGODB_URI && env !== 'test') {
    console.warn('[Config] MONGODB_URI not set. Falling back to local MongoDB.');
  }
};

module.exports = { parseAllowedOrigins, validateEnv };
