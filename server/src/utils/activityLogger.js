const ActivityLog = require('../models/ActivityLog');

/**
 * Records an audit entry. Never throws: a failed log write must not
 * break the business operation that triggered it.
 */
async function logActivity(req, { action, entity, entityId, description, meta }) {
  try {
    await ActivityLog.create({
      user: req.user?._id,
      username: req.user?.username,
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      description,
      meta,
      ipAddress: req.ip,
    });
  } catch (err) {
    console.error('Activity log write failed:', err.message);
  }
}

module.exports = logActivity;
