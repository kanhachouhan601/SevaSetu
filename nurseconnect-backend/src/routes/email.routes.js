// src/routes/email.routes.js
const express = require('express');
const router = express.Router();
const { sendEmail } = require('../controllers/email.controller');
const { protect } = require('../middleware/auth.middleware');

// POST /api/email/send — send email via Nodemailer Gmail
router.post('/send', protect, sendEmail);

module.exports = router;
