// src/routes/request.routes.js
const express = require('express');
const router = express.Router();
const {
  createRequest,
  getPatientRequests,
  getNurseRequests,
  getOpenRequests,
  getRequestForNurseInterview,
  generateLongtermInterviewQuestions,
  submitLongtermInterview,
  updateRequestStatus,
  rateCompletedRequest,
  raiseSafetySOS,
  checkInVisit,
  checkOutVisit,
  reportPatientBehavior,
} = require('../controllers/request.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { uploadRequestFiles } = require('../middleware/upload.middleware');
const { rateLimit } = require('../middleware/rateLimit.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  createRequestRules,
  otpRules,
  patientReportRules,
  ratingRules,
  statusRules,
} = require('../validation/schemas');

// POST /api/request — patient creates service request
router.post(
  '/',
  protect,
  authorize('patient', 'admin'),
  rateLimit({ windowMs: 60 * 1000, max: 8, scope: 'request-create' }),
  uploadRequestFiles.array('attachments', 5),
  validate(createRequestRules),
  createRequest
);

// GET /api/request/patient — patient sees their own requests
router.get('/patient', protect, authorize('patient', 'admin'), getPatientRequests);

// GET /api/request/nurse — nurse sees their assigned requests
router.get('/nurse', protect, authorize('nurse', 'admin'), getNurseRequests);

// GET /api/request/open — nurse sees unassigned pending requests
router.get('/open', protect, authorize('nurse', 'admin'), getOpenRequests);

// GET /api/request/:id/interview — nurse interview room request details
router.get('/:id/interview', protect, authorize('nurse', 'admin'), getRequestForNurseInterview);

// POST /api/request/:id/interview/questions — generate patient-specific interview questions
router.post('/:id/interview/questions', protect, authorize('nurse', 'admin'), rateLimit({ windowMs: 60 * 1000, max: 6, scope: 'request-interview-questions' }), generateLongtermInterviewQuestions);

// POST /api/request/:id/interview/submit — submit AI interview answers
router.post('/:id/interview/submit', protect, authorize('nurse', 'admin'), rateLimit({ windowMs: 60 * 1000, max: 4, scope: 'request-interview-submit' }), submitLongtermInterview);

// POST /api/request/:id/rating — patient rates completed nurse service
router.post('/:id/rating', protect, authorize('patient', 'admin'), validate(ratingRules), rateCompletedRequest);

// Nurse safety and verified visit flow
router.post('/:id/safety/sos', protect, authorize('nurse', 'admin'), rateLimit({ windowMs: 60 * 1000, max: 5, scope: 'safety-sos' }), raiseSafetySOS);
router.post('/:id/safety/patient-report', protect, authorize('nurse', 'admin'), validate(patientReportRules), reportPatientBehavior);
router.post('/:id/visit/check-in', protect, authorize('nurse', 'admin'), validate(otpRules), checkInVisit);
router.post('/:id/visit/check-out', protect, authorize('nurse', 'admin'), validate(otpRules), checkOutVisit);

// PUT /api/request/:id/status — update request status
router.put('/:id/status', protect, validate(statusRules), updateRequestStatus);

module.exports = router;
