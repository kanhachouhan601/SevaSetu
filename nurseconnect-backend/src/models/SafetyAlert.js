const mongoose = require('mongoose');

const safetyAlertSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    nurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: ['sos', 'unsafe_patient', 'late_checkout', 'manual_review'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['medium', 'high', 'critical'],
      default: 'high',
    },
    message: {
      type: String,
      trim: true,
      required: true,
    },
    location: {
      lat: Number,
      lng: Number,
      accuracy: Number,
      capturedAt: Date,
    },
    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open',
    },
    resolvedAt: Date,
    resolutionNote: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SafetyAlert', safetyAlertSchema);
