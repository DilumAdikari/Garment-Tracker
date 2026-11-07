const DailyProduction = require('../models/DailyProduction');
const Issue = require('../models/Issue');
const logActivity = require('../utils/activityLogger');
const asyncHandler = require('../utils/asyncHandler');
const { buildDateFilter, badRequest } = require('../utils/dateRange');
const { recalculateIssue } = require('./issueController');

const startOfDay = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw badRequest('Invalid date');
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * GET /api/production
 * Filters: issue, plant, style, jobSheet, from, to
 */
exports.list = asyncHandler(async (req, res) => {
  const { issue, plant, style, jobSheet, page = 1, limit = 25 } = req.query;
  const filter = { isDeleted: false, ...(buildDateFilter(req.query, 'date') || {}) };
  if (issue) filter.issue = issue;
  if (plant) filter.plant = plant;
  if (style) filter.style = style;
  if (jobSheet) filter.jobSheet = jobSheet;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(parseInt(limit, 10) || 25, 200);

  const [items, total] = await Promise.all([
    DailyProduction.find(filter)
      .populate('plant', 'name code')
      .populate('style', 'styleNumber')
      .populate('jobSheet', 'jobSheetNumber')
      .populate('enteredBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize),
    DailyProduction.countDocuments(filter),
  ]);

  res.json({ items, total, page: pageNum, pages: Math.ceil(total / pageSize) });
});

/**
 * POST /api/production
 * Body: issue, date, completedQuantity, sentOutQuantity?, remarks?
 * One entry per issue per day. If one already exists for that date it is updated.
 */
exports.create = asyncHandler(async (req, res) => {
  const { issue: issueId, date, completedQuantity, sentOutQuantity, remarks } = req.body;

  if (!issueId || !date || completedQuantity === undefined || completedQuantity === '') {
    return res.status(400).json({ message: 'Issue, date and completed quantity are required' });
  }
  const qty = Number(completedQuantity);
  if (!Number.isInteger(qty) || qty < 0) {
    return res.status(400).json({ message: 'Completed quantity must be a whole number of 0 or more' });
  }

  const issue = await Issue.findById(issueId);
  if (!issue) return res.status(404).json({ message: 'Issue not found' });
  if (issue.status === 'closed') {
    return res.status(400).json({ message: 'This issue is closed. Reopen it before adding production.' });
  }

  const day = startOfDay(date);
  const existing = await DailyProduction.findOne({ issue: issue._id, date: day, isDeleted: false });

  // Cumulative check: other days' totals plus this entry must not exceed issued quantity.
  const othersTotal = await DailyProduction.aggregate([
    { $match: { issue: issue._id, isDeleted: false, ...(existing ? { _id: { $ne: existing._id } } : {}) } },
    { $group: { _id: null, total: { $sum: '$completedQuantity' } } },
  ]);
  const alreadyDone = othersTotal[0]?.total || 0;
  if (alreadyDone + qty > issue.issuedQuantity) {
    return res.status(400).json({
      message: `Completed total would be ${alreadyDone + qty}, which exceeds the issued quantity of ${issue.issuedQuantity}. Remaining is ${issue.issuedQuantity - alreadyDone}.`,
    });
  }

  let entry;
  let action = 'PRODUCTION_ENTRY';
  if (existing) {
    existing.completedQuantity = qty;
    existing.sentOutQuantity = sentOutQuantity !== undefined ? Number(sentOutQuantity) : existing.sentOutQuantity;
    existing.remarks = remarks ?? existing.remarks;
    existing.enteredBy = req.user._id;
    entry = await existing.save();
    action = 'PRODUCTION_UPDATE';
  } else {
    entry = await DailyProduction.create({
      issue: issue._id,
      plant: issue.plant,
      style: issue.style,
      jobSheet: issue.jobSheet,
      date: day,
      completedQuantity: qty,
      sentOutQuantity: sentOutQuantity !== undefined ? Number(sentOutQuantity) : qty,
      remarks,
      enteredBy: req.user._id,
    });
  }

  await recalculateIssue(issue._id);
  await logActivity(req, {
    action,
    entity: 'DailyProduction',
    entityId: entry._id,
    description: `${existing ? 'Updated' : 'Recorded'} ${qty} pcs for ${issue.issueNumber} on ${day.toISOString().slice(0, 10)}`,
    meta: { issueNumber: issue.issueNumber, date: day, qty },
  });

  res.status(existing ? 200 : 201).json(entry);
});

/** DELETE /api/production/:id — soft delete so history is preserved. */
exports.remove = asyncHandler(async (req, res) => {
  const entry = await DailyProduction.findById(req.params.id);
  if (!entry || entry.isDeleted) return res.status(404).json({ message: 'Entry not found' });

  entry.isDeleted = true;
  await entry.save();
  await recalculateIssue(entry.issue);
  await logActivity(req, {
    action: 'PRODUCTION_DELETE',
    entity: 'DailyProduction',
    entityId: entry._id,
    description: `Deleted production entry of ${entry.completedQuantity} pcs`,
  });
  res.json({ message: 'Production entry deleted' });
});
