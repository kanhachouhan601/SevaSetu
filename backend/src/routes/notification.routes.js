const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  markNotificationsRead,
} = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getMyNotifications);
router.put('/read', protect, markNotificationsRead);

module.exports = router;
