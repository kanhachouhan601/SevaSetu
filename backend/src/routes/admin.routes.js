// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const {
  getStats,
  getAllNurses,
  approveNurse,
  rejectNurse,
  getAllPatients,
  getAllRequests,
  getActivity,
  getSafetyAlerts,
  resolveSafetyAlert,
  approveRequestSafety,
  approvePatientRequest,
  rejectPatientRequest,
  verifyPatientAddress,
  clearPatientSafetyFlag,
  getInterviewReports,
  getAuditLogs,
} = require('../controllers/admin.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { adminNoteRules } = require('../validation/schemas');

// All admin routes require authentication + admin role
router.use(protect, authorize('admin'));

// GET /api/admin/stats
router.get('/stats', getStats);

// GET /api/admin/nurses?status=pending|approved|rejected
router.get('/nurses', getAllNurses);

// PUT /api/admin/nurse/:id/approve
router.put('/nurse/:id/approve', validate(adminNoteRules), approveNurse);

// PUT /api/admin/nurse/:id/reject
router.put('/nurse/:id/reject', validate(adminNoteRules), rejectNurse);

// GET /api/admin/patients
router.get('/patients', getAllPatients);

// PUT /api/admin/patient/:id/address-verify
router.put('/patient/:id/address-verify', validate(adminNoteRules), verifyPatientAddress);

// PUT /api/admin/patient/:id/safety-clear
router.put('/patient/:id/safety-clear', validate(adminNoteRules), clearPatientSafetyFlag);

// GET /api/admin/requests
router.get('/requests', getAllRequests);

// Patient request approval queue
router.put('/request/:id/approve', validate(adminNoteRules), approvePatientRequest);
router.put('/request/:id/reject', validate(adminNoteRules), rejectPatientRequest);

// GET /api/admin/activity
router.get('/activity', getActivity);

// GET /api/admin/audit-logs
router.get('/audit-logs', getAuditLogs);

// GET /api/admin/interview-reports
router.get('/interview-reports', getInterviewReports);

// Safety panel
router.get('/safety-alerts', getSafetyAlerts);
router.put('/safety-alert/:id/resolve', validate(adminNoteRules), resolveSafetyAlert);
router.put('/request/:id/safety-approve', validate(adminNoteRules), approveRequestSafety);

module.exports = router;
