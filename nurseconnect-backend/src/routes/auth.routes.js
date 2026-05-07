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

// POST /api/auth/register
router.post(
  '/register',
  uploadNurseDocuments.fields([
    { name: 'nursingCert', maxCount: 1 },
    { name: 'idProof', maxCount: 1 },
    { name: 'resume', maxCount: 1 },
  ]),
  register
);

// POST /api/auth/register/validate — validate form before AI interview starts
router.post('/register/validate', validateRegistrationStart);

// POST /api/auth/nurse-interview/assess — public AI assessment before nurse account exists
router.post('/nurse-interview/assess', assessNurseInterviewAnswer);

// POST /api/auth/nurse-interview/questions — AI-generated clinical questions by specialization
router.post('/nurse-interview/questions', generateNurseInterviewQuestions);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me  (JWT protected)
router.get('/me', protect, getMe);

module.exports = router;
