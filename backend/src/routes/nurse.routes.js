// src/routes/nurse.routes.js
const express = require('express');
const router = express.Router();
const {
  createProfile,
  getProfile,
  updateProfile,
  getApprovedNurses,
  getMyProfile,
} = require('../controllers/nurse.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { nurseProfileRules } = require('../validation/schemas');

// GET /api/nurse/jobs — public: list approved nurses for patients to browse
router.get('/jobs', protect, getApprovedNurses);

// GET /api/nurse/my-profile — nurse gets own profile
router.get('/my-profile', protect, authorize('nurse'), getMyProfile);

// POST /api/nurse/profile — create nurse profile
router.post('/profile', protect, authorize('nurse'), validate(nurseProfileRules), createProfile);

// GET /api/nurse/profile/:id — get nurse profile by userId or profileId
router.get('/profile/:id', protect, getProfile);

// PUT /api/nurse/profile — update nurse profile
router.put('/profile', protect, authorize('nurse'), validate(nurseProfileRules), updateProfile);

module.exports = router;
