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
      ],
      default: 'system',
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

module.exports = mongoose.model('Notification', notificationSchema);
