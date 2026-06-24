// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  assessNurseInterviewAnswer,
  generateNurseInterviewQuestions,
  validateRegistrationStart,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { uploadNurseDocuments } = require('../middleware/upload.middleware');
const { rateLimit } = require('../middleware/rateLimit.middleware');
const { validate } = require('../middleware/validate.middleware');
const { loginRules, registerRules } = require('../validation/schemas');

// POST /api/auth/register
router.post(
  '/register',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 12, scope: 'auth-register' }),
  uploadNurseDocuments.fields([
    { name: 'nursingCert', maxCount: 1 },
    { name: 'idProof', maxCount: 1 },
    { name: 'resume', maxCount: 1 },
  ]),
  validate(registerRules),
  register
);

// POST /api/auth/register/validate — validate form before AI interview starts
router.post('/register/validate', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, scope: 'auth-validate' }), validate(registerRules), validateRegistrationStart);

// POST /api/auth/nurse-interview/assess — public AI assessment before nurse account exists
router.post('/nurse-interview/assess', rateLimit({ windowMs: 60 * 1000, max: 8, scope: 'auth-ai-assess' }), assessNurseInterviewAnswer);

// POST /api/auth/nurse-interview/questions — AI-generated clinical questions by specialization
router.post('/nurse-interview/questions', rateLimit({ windowMs: 60 * 1000, max: 5, scope: 'auth-ai-questions' }), generateNurseInterviewQuestions);

// POST /api/auth/login
router.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, scope: 'auth-login' }), validate(loginRules), login);

// GET /api/auth/me  (JWT protected)
router.get('/me', protect, getMe);

module.exports = router;
