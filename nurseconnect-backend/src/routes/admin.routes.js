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
  verifyPatientAddress,
  clearPatientSafetyFlag,
} = require('../controllers/admin.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// All admin routes require authentication + admin role
router.use(protect, authorize('admin'));

// GET /api/admin/stats
router.get('/stats', getStats);

// GET /api/admin/nurses?status=pending|approved|rejected
router.get('/nurses', getAllNurses);

// PUT /api/admin/nurse/:id/approve
router.put('/nurse/:id/approve', approveNurse);

// PUT /api/admin/nurse/:id/reject
router.put('/nurse/:id/reject', rejectNurse);

// GET /api/admin/patients
router.get('/patients', getAllPatients);

// PUT /api/admin/patient/:id/address-verify
router.put('/patient/:id/address-verify', verifyPatientAddress);

// PUT /api/admin/patient/:id/safety-clear
router.put('/patient/:id/safety-clear', clearPatientSafetyFlag);

// GET /api/admin/requests
router.get('/requests', getAllRequests);

// GET /api/admin/activity
router.get('/activity', getActivity);

// Safety panel
router.get('/safety-alerts', getSafetyAlerts);
router.put('/safety-alert/:id/resolve', resolveSafetyAlert);
router.put('/request/:id/safety-approve', approveRequestSafety);

module.exports = router;
