// src/routes/email.routes.js
const express = require('express');
const router = express.Router();
const { sendEmail } = require('../controllers/email.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { rateLimit } = require('../middleware/rateLimit.middleware');
const { validate } = require('../middleware/validate.middleware');
const { emailRules } = require('../validation/schemas');

// POST /api/email/send — send email via Nodemailer Gmail
router.post('/send', protect, authorize('admin'), rateLimit({ windowMs: 60 * 1000, max: 20, scope: 'email-send' }), validate(emailRules), sendEmail);

module.exports = router;
