const test = require('node:test');
const assert = require('node:assert/strict');

const { sanitizeForLog } = require('../src/utils/security');
const { parseAllowedOrigins, validateEnv } = require('../src/utils/env');
const { validate } = require('../src/middleware/validate.middleware');
const { loginRules, createRequestRules } = require('../src/validation/schemas');

const runMiddleware = (middleware, req) => new Promise((resolve) => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      resolve({ nextCalled: false, res: this });
    },
  };
  middleware(req, res, () => resolve({ nextCalled: true, res }));
});

test('sanitizeForLog redacts sensitive fields', () => {
  const result = sanitizeForLog({
    email: 'patient@example.com',
    phone: '9876543210',
    password: 'secret',
    nested: { token: 'jwt', address: 'Home address', problem: 'medical issue' },
  });

  assert.equal(result.email, 'pa***@example.com');
  assert.equal(result.phone, '******3210');
  assert.equal(result.password, '[REDACTED]');
  assert.equal(result.nested.token, '[REDACTED]');
  assert.equal(result.nested.address, '[REDACTED_ADDRESS]');
  assert.equal(result.nested.problem, '[REDACTED_HEALTH_TEXT]');
});

test('login validation rejects invalid email', async () => {
  const result = await runMiddleware(validate(loginRules), {
    requestId: 'test',
    body: { email: 'bad-email', password: 'pass123' },
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 400);
  assert.equal(result.res.body.code, 'VALIDATION_ERROR');
});

test('request validation accepts valid booking payload', async () => {
  const result = await runMiddleware(validate(createRequestRules), {
    requestId: 'test',
    body: {
      mode: 'temporary',
      problem: 'Injection and BP monitoring needed',
      patientAge: 67,
      triageLevel: 'medium',
    },
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.res.statusCode, 200);
});

test('request validation rejects invalid mode', async () => {
  const result = await runMiddleware(validate(createRequestRules), {
    requestId: 'test',
    body: { mode: 'weekly', problem: 'Need care' },
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 400);
});

test('allowed origins include frontend and comma-separated extras', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;

  process.env.FRONTEND_URL = 'https://app.example.com';
  process.env.ALLOWED_ORIGINS = 'https://admin.example.com, https://partner.example.com';

  assert.deepEqual(parseAllowedOrigins(), [
    'https://app.example.com',
    'https://admin.example.com',
    'https://partner.example.com',
  ]);

  process.env.FRONTEND_URL = originalFrontendUrl;
  process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
});

test('production env rejects placeholder JWT secret', () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL,
  };

  process.env.NODE_ENV = 'production';
  process.env.MONGODB_URI = 'mongodb+srv://example';
  process.env.JWT_SECRET = 'replace-with-at-least-32-random-characters';
  process.env.FRONTEND_URL = 'https://app.example.com';

  assert.throws(() => validateEnv(), /placeholder value/);

  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
