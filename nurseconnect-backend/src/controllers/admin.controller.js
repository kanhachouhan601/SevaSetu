// src/controllers/admin.controller.js
const User = require('../models/User');
const NurseProfile = require('../models/NurseProfile');
const Request = require('../models/Request');
const Notification = require('../models/Notification');
const SafetyAlert = require('../models/SafetyAlert');

// ─── GET /api/admin/stats ─────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const [
      totalNurses,
      activeNurses,
      totalPatients,
      activeRequests,
      pendingApprovals,
      completedRequests,
    ] = await Promise.all([
      User.countDocuments({ role: 'nurse' }),
      NurseProfile.countDocuments({ status: 'approved' }),
      User.countDocuments({ role: 'patient' }),
      Request.countDocuments({ status: { $in: ['pending', 'matched', 'in-progress'] } }),
      NurseProfile.countDocuments({ status: 'pending' }),
      Request.find({ status: 'completed' }).select('amount'),
    ]);

    const totalRevenue = completedRequests.reduce((sum, r) => sum + (r.amount || 0), 0);

    res.json({
      success: true,
      stats: {
        totalNurses,
        activeNurses,
        totalPatients,
        activeRequests,
        pendingApprovals,
        totalRevenue,
        totalRequests: await Request.countDocuments(),
      },
    });
  } catch (error) {
    console.error('[Admin Stats]', error);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
};

// ─── GET /api/admin/nurses ────────────────────────────────────
const getAllNurses = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [nurses, total] = await Promise.all([
      NurseProfile.find(filter)
        .populate('userId', '-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      NurseProfile.countDocuments(filter),
    ]);

    res.json({
      success: true,
      nurses,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    console.error('[Admin GetNurses]', error);
    res.status(500).json({ error: 'Failed to fetch nurses.' });
  }
};

// ─── PUT /api/admin/nurse/:id/approve ─────────────────────────
const approveNurse = async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await NurseProfile.findById(id).populate('userId', 'name email');
    if (!profile) {
      return res.status(404).json({ error: 'Nurse profile not found.' });
    }

    const hasDocumentFlags = Boolean(
      profile.documents?.nursingCert &&
      profile.documents?.idProof &&
      profile.documents?.cvUploaded
    );
    const hasDocumentFiles = Boolean(
      profile.documentFiles?.nursingCert?.url &&
      profile.documentFiles?.idProof?.url &&
      profile.documentFiles?.resume?.url
    );

    if (!hasDocumentFlags && !hasDocumentFiles) {
      return res.status(400).json({ error: 'Cannot approve nurse until certificate, ID proof and resume are uploaded.' });
    }

    profile.status = 'approved';
    profile.rejectionReason = null;
    await profile.save();

    // Notify nurse
    await Notification.create({
      userId: profile.userId._id,
      message: `Congratulations! Your nurse profile has been approved. You can now receive patient requests.`,
      type: 'nurse_approved',
    });

    res.json({ success: true, profile, message: `Nurse ${profile.userId.name} approved successfully.` });
  } catch (error) {
    console.error('[Admin ApproveNurse]', error);
    res.status(500).json({ error: 'Failed to approve nurse.' });
  }
};

// ─── PUT /api/admin/nurse/:id/reject ──────────────────────────
const rejectNurse = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const profile = await NurseProfile.findByIdAndUpdate(
      id,
      { $set: { status: 'rejected', rejectionReason: reason || 'Does not meet requirements.' } },
      { new: true }
    ).populate('userId', 'name email');

    if (!profile) {
      return res.status(404).json({ error: 'Nurse profile not found.' });
    }

    await Notification.create({
      userId: profile.userId._id,
      message: `Your nurse application was not approved. Reason: ${reason || 'Does not meet requirements.'}`,
      type: 'nurse_rejected',
    });

    res.json({ success: true, profile, message: `Nurse ${profile.userId.name} rejected.` });
  } catch (error) {
    console.error('[Admin RejectNurse]', error);
    res.status(500).json({ error: 'Failed to reject nurse.' });
  }
};

// ─── GET /api/admin/patients ──────────────────────────────────
const getAllPatients = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [patients, total] = await Promise.all([
      User.find({ role: 'patient' })
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments({ role: 'patient' }),
    ]);

    res.json({
      success: true,
      patients,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    console.error('[Admin GetPatients]', error);
    res.status(500).json({ error: 'Failed to fetch patients.' });
  }
};

// ─── GET /api/admin/requests ──────────────────────────────────
const getAllRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      Request.find(filter)
        .populate('patientId', 'name email phone')
        .populate('nurseId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Request.countDocuments(filter),
    ]);

    res.json({
      success: true,
      requests,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    console.error('[Admin GetRequests]', error);
    res.status(500).json({ error: 'Failed to fetch requests.' });
  }
};

// ─── GET /api/admin/activity ──────────────────────────────────
// Recent activity log from Notifications collection
const getActivity = async (req, res) => {
  try {
    const { limit = 30 } = req.query;

    const activity = await Notification.find()
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, activity });
  } catch (error) {
    console.error('[Admin GetActivity]', error);
    res.status(500).json({ error: 'Failed to fetch activity.' });
  }
};

const getSafetyAlerts = async (req, res) => {
  try {
    const { status = 'open', limit = 50 } = req.query;
    const lateSince = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const lateRequests = await Request.find({
      status: 'in-progress',
      nurseId: { $ne: null },
      'visit.checkedInAt': { $lte: lateSince },
      'visit.checkedOutAt': { $exists: false },
    }).select('_id patientId nurseId visit');

    for (const request of lateRequests) {
      const exists = await SafetyAlert.exists({
        requestId: request._id,
        type: 'late_checkout',
        status: 'open',
      });
      if (!exists) {
        await SafetyAlert.create({
          requestId: request._id,
          patientId: request.patientId,
          nurseId: request.nurseId,
          type: 'late_checkout',
          severity: 'high',
          message: 'Nurse checked in more than 4 hours ago and has not checked out.',
        });
      }
    }

    const filter = status === 'all' ? {} : { status };
    const alerts = await SafetyAlert.find(filter)
      .populate('patientId', 'name email phone city safety')
      .populate('nurseId', 'name email phone')
      .populate('requestId', 'problem address city status mode visit nursePatientReport safetyReview createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, alerts });
  } catch (error) {
    console.error('[Admin SafetyAlerts]', error);
    res.status(500).json({ error: 'Failed to fetch safety alerts.' });
  }
};

const resolveSafetyAlert = async (req, res) => {
  try {
    const alert = await SafetyAlert.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolutionNote: req.body.note || 'Resolved by admin.',
        },
      },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Safety alert not found.' });
    res.json({ success: true, alert });
  } catch (error) {
    console.error('[Admin ResolveSafety]', error);
    res.status(500).json({ error: 'Failed to resolve safety alert.' });
  }
};

const approveRequestSafety = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found.' });

    request.safetyReview = {
      ...(request.safetyReview || {}),
      approved: true,
      approvedAt: new Date(),
    };
    await request.save();

    await SafetyAlert.updateMany(
      { requestId: request._id, type: 'manual_review', status: 'open' },
      {
        $set: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolutionNote: 'Safety review approved by admin.',
        },
      }
    );

    await Notification.create({
      userId: request.patientId,
      message: 'Admin approved the safety review for your nurse visit.',
      type: 'system',
      metadata: { requestId: request._id },
    });

    if (request.nurseId) {
      await Notification.create({
        userId: request.nurseId,
        message: 'Admin approved this visit safety review. You can continue with the patient request.',
        type: 'system',
        metadata: { requestId: request._id },
      });
    }

    const populated = await Request.findById(request._id)
      .populate('patientId', 'name email phone')
      .populate('nurseId', 'name email phone');

    res.json({ success: true, request: populated });
  } catch (error) {
    console.error('[Admin ApproveSafety]', error);
    res.status(500).json({ error: 'Failed to approve safety review.' });
  }
};

const verifyPatientAddress = async (req, res) => {
  try {
    const patient = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'patient' },
      { $set: { 'safety.addressVerified': true } },
      { new: true }
    ).select('-password');

    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    res.json({ success: true, patient });
  } catch (error) {
    console.error('[Admin VerifyPatientAddress]', error);
    res.status(500).json({ error: 'Failed to verify patient address.' });
  }
};

const clearPatientSafetyFlag = async (req, res) => {
  try {
    const patient = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'patient' },
      {
        $set: {
          'safety.unsafeFlag': false,
          'safety.unsafeReason': '',
        },
      },
      { new: true }
    ).select('-password');

    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    res.json({ success: true, patient });
  } catch (error) {
    console.error('[Admin ClearPatientSafety]', error);
    res.status(500).json({ error: 'Failed to clear patient safety flag.' });
  }
};

module.exports = {
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
};
