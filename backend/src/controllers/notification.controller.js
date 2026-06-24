const Notification = require('../models/Notification');

const getMyNotifications = async (req, res) => {
  try {
    const { limit = 20, unreadOnly = 'false' } = req.query;
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const filter = { userId: req.user._id };
    if (unreadOnly === 'true') filter.read = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(safeLimit),
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
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const filter = { userId: req.user._id, read: false };
    if (ids.length) filter._id = { $in: ids };

    await Notification.updateMany(
      filter,
      { $set: { read: true } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[Notification MarkRead]', error);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
};

module.exports = { getMyNotifications, markNotificationsRead };
