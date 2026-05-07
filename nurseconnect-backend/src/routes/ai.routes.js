// src/routes/ai.routes.js
const express = require('express');
const router = express.Router();
const { triage, interview, nurseMatch } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

// POST /api/ai/triage — Priya AI health companion
router.post('/triage', protect, triage);

// POST /api/ai/interview — Nurse vetting interview
router.post('/interview', protect, interview);

// POST /api/ai/nurse-match — AI matches patient to best nurse
router.post('/nurse-match', protect, nurseMatch);

module.exports = router;
