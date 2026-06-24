// src/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'nurse_approved',
        'nurse_rejected',
        'request_created',
        'request_matched',
        'request_completed',
        'request_cancelled',
        'system',
        'payment',
        'safety_alert',
        'sos',
        'unsafe_patient',
        'ai_video',
      ],
      default: 'system',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal',
    },
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Helper static to create & save a notification quickly
notificationSchema.statics.create_notify = async function (userId, message, type = 'system', metadata = {}) {
  return this.create({ userId, message, type, metadata });
};

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ priority: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
