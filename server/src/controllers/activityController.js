const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../utils/asyncHandler');
const { buildDateFilter } = require('../utils/dateRange');

/** GET /api/activity?page=&limit=&action=&entity=&from=&to= */
exports.list = asyncHandler(async (req, res) => {
  const { action, entity, page = 1, limit = 25 } = req.query;
  const filter = { ...(buildDateFilter(req.query, 'createdAt') || {}) };
  if (action) filter.action = action;
  if (entity) filter.entity = entity;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(parseInt(limit, 10) || 25, 200);

  const [items, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize),
    ActivityLog.countDocuments(filter),
  ]);

  res.json({ items, total, page: pageNum, pages: Math.ceil(total / pageSize) });
});
