const Issue = require('../models/Issue');
const DailyProduction = require('../models/DailyProduction');
const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../utils/asyncHandler');
const { buildDateFilter } = require('../utils/dateRange');

const pct = (done, total) => (total > 0 ? Math.round((done / total) * 1000) / 10 : 0);

/**
 * GET /api/dashboard?from=&to=
 * Returns headline KPIs, a daily trend, plant-wise and style-wise progress.
 * Issued figures use issue date; completed figures use the production date.
 */
exports.summary = asyncHandler(async (req, res) => {
  const issueFilter = buildDateFilter(req.query, 'issueDate') || {};
  const prodFilter = { isDeleted: false, ...(buildDateFilter(req.query, 'date') || {}) };

  const [issueTotals, dailyTrend, plantProgress, styleProgress, statusBreakdown, recentActivity] = await Promise.all([
    Issue.aggregate([
      { $match: issueFilter },
      {
        $group: {
          _id: null,
          issued: { $sum: '$issuedQuantity' },
          completed: { $sum: '$completedQuantity' },
          issues: { $sum: 1 },
        },
      },
    ]),

    DailyProduction.aggregate([
      { $match: prodFilter },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, completed: { $sum: '$completedQuantity' }, sentOut: { $sum: '$sentOutQuantity' } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', completed: 1, sentOut: 1 } },
    ]),

    Issue.aggregate([
      { $match: issueFilter },
      {
        $group: {
          _id: '$plant',
          issued: { $sum: '$issuedQuantity' },
          completed: { $sum: '$completedQuantity' },
          issues: { $sum: 1 },
        },
      },
      { $lookup: { from: 'plants', localField: '_id', foreignField: '_id', as: 'plant' } },
      { $unwind: '$plant' },
      { $project: { _id: 0, plantId: '$_id', name: '$plant.name', code: '$plant.code', issued: 1, completed: 1, issues: 1 } },
      { $sort: { name: 1 } },
    ]),

    Issue.aggregate([
      { $match: issueFilter },
      {
        $group: {
          _id: '$style',
          issued: { $sum: '$issuedQuantity' },
          completed: { $sum: '$completedQuantity' },
          issues: { $sum: 1 },
        },
      },
      { $lookup: { from: 'styles', localField: '_id', foreignField: '_id', as: 'style' } },
      { $unwind: '$style' },
      { $project: { _id: 0, styleId: '$_id', styleNumber: '$style.styleNumber', issued: 1, completed: 1, issues: 1 } },
      { $sort: { styleNumber: 1 } },
    ]),

    Issue.aggregate([
      { $match: issueFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    ActivityLog.find().sort({ createdAt: -1 }).limit(10),
  ]);

  const totals = issueTotals[0] || { issued: 0, completed: 0, issues: 0 };
  const remaining = Math.max(totals.issued - totals.completed, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayAgg = await DailyProduction.aggregate([
    { $match: { isDeleted: false, date: { $gte: todayStart } } },
    { $group: { _id: null, completed: { $sum: '$completedQuantity' } } },
  ]);

  res.json({
    kpis: {
      totalIssued: totals.issued,
      totalCompleted: totals.completed,
      remaining,
      completionPercent: pct(totals.completed, totals.issued),
      activeIssues: totals.issues,
      todayCompleted: todayAgg[0]?.completed || 0,
    },
    dailyTrend,
    plantProgress: plantProgress.map((p) => ({ ...p, pending: Math.max(p.issued - p.completed, 0), percent: pct(p.completed, p.issued) })),
    styleProgress: styleProgress.map((s) => ({ ...s, pending: Math.max(s.issued - s.completed, 0), percent: pct(s.completed, s.issued) })),
    statusBreakdown: statusBreakdown.map((s) => ({ status: s._id, count: s.count })),
    recentActivity,
  });
});
