// src/models/NurseProfile.js
const mongoose = require('mongoose');

const nurseProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specializations: {
      type: [String],
      default: [],
      // e.g. ['General Care', 'ICU', 'Pediatrics', 'Elder Care', 'Emergency', 'Wound Care']
    },
    experience: {
      type: Number, // years of experience
      default: 0,
    },
    bio: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['female', 'male', 'other', 'prefer_not_to_say', null],
      default: null,
    },
    documents: {
      nursingCert: { type: Boolean, default: false },
      idProof: { type: Boolean, default: false },
      cvUploaded: { type: Boolean, default: false },
    },
    documentFiles: {
      nursingCert: {
        originalName: { type: String, trim: true },
        filename: { type: String, trim: true },
        url: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        size: { type: Number, default: 0 },
      },
      idProof: {
        originalName: { type: String, trim: true },
        filename: { type: String, trim: true },
        url: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        size: { type: Number, default: 0 },
      },
      resume: {
        originalName: { type: String, trim: true },
        filename: { type: String, trim: true },
        url: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        size: { type: Number, default: 0 },
      },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    earnings: {
      type: Number,
      default: 0,
    },
    location: {
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    currentLocation: {
      lat: Number,
      lng: Number,
      accuracy: Number,
      capturedAt: Date,
    },
    hourlyRate: {
      type: Number,
      default: 0,
    },
    availability: {
      type: Boolean,
      default: true,
    },
    interviewScore: {
      type: Number,
      default: null,
    },
    interviewFeedback: {
      type: String,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NurseProfile', nurseProfileSchema);
