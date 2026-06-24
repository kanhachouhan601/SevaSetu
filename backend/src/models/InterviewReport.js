const mongoose = require('mongoose');

const interviewReportSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      index: true,
    },
    nurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    candidateName: {
      type: String,
      trim: true,
      default: 'Nurse Candidate',
    },
    interviewDate: {
      type: Date,
      default: Date.now,
    },
    overallScore: {
      type: Number,
      default: 0,
    },
    recommendation: {
      type: String,
      trim: true,
      default: 'Review Required',
    },
    scores: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    attentionEvents: {
      type: Array,
      default: [],
    },
    strengths: {
      type: [String],
      default: [],
    },
    concerns: {
      type: [String],
      default: [],
    },
    adminNotes: {
      type: String,
      trim: true,
      default: '',
    },
    transcript: {
      type: Array,
      default: [],
    },
    patientProblem: {
      type: String,
      trim: true,
      default: '',
    },
    backendScore: {
      type: Number,
      default: null,
    },
    backendPassed: {
      type: Boolean,
      default: null,
    },
    backendFeedback: {
      type: String,
      trim: true,
      default: '',
    },
    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true }
);

interviewReportSchema.index({ requestId: 1, nurseId: 1 }, { unique: true });

module.exports = mongoose.model('InterviewReport', interviewReportSchema);
