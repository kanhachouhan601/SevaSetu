// src/routes/ai.routes.js
const express = require('express');
const router = express.Router();
const { triage, interview, nurseMatch } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');
const { rateLimit } = require('../middleware/rateLimit.middleware');
const { validate } = require('../middleware/validate.middleware');
const { aiTriageRules } = require('../validation/schemas');

// POST /api/ai/triage — Priya AI health companion
router.post('/triage', protect, rateLimit({ windowMs: 60 * 1000, max: 12, scope: 'ai-triage' }), validate(aiTriageRules), triage);

// POST /api/ai/interview — Nurse vetting interview
router.post('/interview', protect, rateLimit({ windowMs: 60 * 1000, max: 8, scope: 'ai-interview' }), interview);

// POST /api/ai/nurse-match — AI matches patient to best nurse
router.post('/nurse-match', protect, rateLimit({ windowMs: 60 * 1000, max: 10, scope: 'ai-match' }), nurseMatch);

module.exports = router;
