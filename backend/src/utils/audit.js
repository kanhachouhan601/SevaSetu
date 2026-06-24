const AdminAuditLog = require('../models/AdminAuditLog');
const { sanitizeForLog } = require('./security');

const recordAdminAction = async (req, { action, targetType, targetId, summary, metadata = {} }) => {
  try {
    if (!req.user?._id) return null;
    return await AdminAuditLog.create({
      adminId: req.user._id,
      action,
      targetType,
      targetId,
      summary,
      metadata: sanitizeForLog(metadata),
      requestId: req.requestId,
      ip: req.ip,
    });
  } catch (error) {
    console.error('[Admin Audit Failed]', error.message);
    return null;
  }
};

module.exports = { recordAdminAction };
