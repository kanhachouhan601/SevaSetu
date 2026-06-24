// src/models/Request.js
const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema(
  {
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
    mode: {
      type: String,
      enum: ['temporary', 'longterm'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending-admin', 'pending', 'matched', 'interview-scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'pending-admin',
    },
    problem: {
      type: String,
      required: [true, 'Problem description is required'],
      trim: true,
    },
    aiSummary: {
      type: String,
      default: null,
    },
    triageLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    safetyReview: {
      required: { type: Boolean, default: false },
      reason: { type: String, trim: true },
      approved: { type: Boolean, default: false },
      approvedAt: Date,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    patientAge: {
      type: Number,
      default: null,
    },
    patientPhone: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    requirements: {
      type: String,
      trim: true,
    },
    attachments: [{
      originalName: { type: String, trim: true },
      filename: { type: String, trim: true },
      url: { type: String, trim: true },
      mimeType: { type: String, trim: true },
      size: { type: Number, default: 0 },
      source: { type: String, enum: ['gallery', 'camera', 'file'], default: 'file' },
    }],
    shortlistedNurseIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    matchingReason: {
      type: String,
      trim: true,
    },
    matchingScores: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    arrivalEtaAt: {
      type: Date,
      default: null,
    },
    rideTracking: {
      estimatedDistanceKm: { type: Number, default: null },
      estimatedArrivalMinutes: { type: Number, default: null },
      nurseStartLocation: {
        lat: Number,
        lng: Number,
        accuracy: Number,
        capturedAt: Date,
      },
      patientLocation: {
        lat: Number,
        lng: Number,
        accuracy: Number,
        capturedAt: Date,
      },
      lastStatus: { type: String, trim: true },
    },
    interviewSchedule: {
      startsAt: { type: Date, default: null },
      endsAt: { type: Date, default: null },
      durationMinutes: { type: Number, default: null },
      type: { type: String, default: null },
      note: { type: String, trim: true },
    },
    completedAt: {
      type: Date,
      default: null,
    },
    visit: {
      checkInOtp: { type: String, trim: true },
      checkOutOtp: { type: String, trim: true },
      checkedInAt: Date,
      checkedOutAt: Date,
      checkInLocation: {
        lat: Number,
        lng: Number,
        accuracy: Number,
        capturedAt: Date,
      },
      checkOutLocation: {
        lat: Number,
        lng: Number,
        accuracy: Number,
        capturedAt: Date,
      },
    },
    nursePatientReport: {
      respectful: { type: String, enum: ['respectful', 'rude', 'harassment_concern', null], default: null },
      environment: { type: String, enum: ['safe', 'unsafe', null], default: null },
      paymentIssue: { type: Boolean, default: false },
      familyBehavior: { type: String, trim: true },
      comment: { type: String, trim: true },
      unsafeFlag: { type: Boolean, default: false },
      reportedAt: Date,
    },
    nurseRating: {
      score: { type: Number, min: 1, max: 5, default: null },
      behavior: { type: String, enum: ['excellent', 'good', 'average', 'poor', null], default: null },
      careQuality: { type: String, enum: ['excellent', 'good', 'average', 'poor', null], default: null },
      comment: { type: String, trim: true },
      ratedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

requestSchema.index({ patientId: 1, createdAt: -1 });
requestSchema.index({ nurseId: 1, status: 1, createdAt: -1 });
requestSchema.index({ status: 1, mode: 1, createdAt: -1 });
requestSchema.index({ 'safetyReview.required': 1, 'safetyReview.approved': 1, createdAt: -1 });

module.exports = mongoose.model('Request', requestSchema);
