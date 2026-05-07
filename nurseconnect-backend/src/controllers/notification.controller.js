const Notification = require('../models/Notification');

const getMyNotifications = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit)),
      Notification.countDocuments({ userId: req.user._id, read: false }),
    ]);

    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    console.error('[Notification GetMine]', error);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
};

const markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[Notification MarkRead]', error);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
};

module.exports = { getMyNotifications, markNotificationsRead };
