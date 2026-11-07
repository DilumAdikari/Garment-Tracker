const Issue = require('../models/Issue');
const JobSheet = require('../models/JobSheet');
const Plant = require('../models/Plant');
const Style = require('../models/Style');
const DailyProduction = require('../models/DailyProduction');
const logActivity = require('../utils/activityLogger');
const asyncHandler = require('../utils/asyncHandler');
const { buildDateFilter, badRequest } = require('../utils/dateRange');

/** Generates the next human-friendly issue number, e.g. ISS-000042. */
async function nextIssueNumber() {
  const last = await Issue.findOne().sort({ createdAt: -1 }).select('issueNumber').lean();
  const lastSeq = last?.issueNumber ? parseInt(last.issueNumber.split('-')[1], 10) : 0;
  return `ISS-${String(lastSeq + 1).padStart(6, '0')}`;
}

/** Recalculates status from the completed quantity. */
function deriveStatus(issue) {
  if (issue.status === 'closed') return 'closed';
  if (issue.completedQuantity >= issue.issuedQuantity) return 'completed';
  if (issue.completedQuantity > 0) return 'in_progress';
  return 'issued';
}

/**
 * GET /api/issues
 * Filters: style, jobSheet, plant, status, search (style/job sheet text), from, to
 */
exports.list = asyncHandler(async (req, res) => {
  const { style, jobSheet, plant, status, search, page = 1, limit = 20 } = req.query;
  const filter = { ...(buildDateFilter(req.query, 'issueDate') || {}) };

  if (style) filter.style = style;
  if (jobSheet) filter.jobSheet = jobSheet;
  if (plant) filter.plant = plant;
  if (status) filter.status = status;

  if (search) {
    const term = new RegExp(escapeRegex(search.trim()), 'i');
    const [styles, sheets] = await Promise.all([
      Style.find({ styleNumber: term }).select('_id').lean(),
      JobSheet.find({ jobSheetNumber: term }).select('_id').lean(),
    ]);
    filter.$or = [
      { style: { $in: styles.map((s) => s._id) } },
      { jobSheet: { $in: sheets.map((s) => s._id) } },
      { issueNumber: term },
    ];
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(parseInt(limit, 10) || 20, 100);

  const [items, total] = await Promise.all([
    Issue.find(filter)
      .populate('style', 'styleNumber description')
      .populate('jobSheet', 'jobSheetNumber color')
      .populate('plant', 'name code')
      .sort({ issueDate: -1, createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize),
    Issue.countDocuments(filter),
  ]);

  res.json({ items, total, page: pageNum, pages: Math.ceil(total / pageSize) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id)
    .populate('style', 'styleNumber description buyer')
    .populate('jobSheet', 'jobSheetNumber color targetQuantity')
    .populate('plant', 'name code contactPerson');
  if (!issue) return res.status(404).json({ message: 'Issue not found' });

  const entries = await DailyProduction.find({ issue: issue._id, isDeleted: false })
    .sort({ date: -1 })
    .populate('enteredBy', 'name');

  res.json({ issue, entries });
});

/**
 * POST /api/issues
 * Body: style, jobSheet, plant, issuedQuantity, issueDate, expectedCompletionDate?, remarks?
 */
exports.create = asyncHandler(async (req, res) => {
  const { style, jobSheet, plant, issuedQuantity, issueDate, expectedCompletionDate, remarks } = req.body;

  if (!style || !jobSheet || !plant || !issuedQuantity || !issueDate) {
    return res.status(400).json({ message: 'Style, job sheet, plant, quantity and issue date are required' });
  }
  if (Number(issuedQuantity) <= 0) {
    return res.status(400).json({ message: 'Issued quantity must be greater than zero' });
  }

  // Validate that the job sheet belongs to the chosen style.
  const sheet = await JobSheet.findById(jobSheet);
  if (!sheet) return res.status(400).json({ message: 'Job sheet not found' });
  if (String(sheet.style) !== String(style)) {
    return res.status(400).json({ message: 'This job sheet does not belong to the selected style' });
  }
  if (sheet.isClosed) return res.status(400).json({ message: 'This job sheet is closed' });

  const plantDoc = await Plant.findById(plant);
  if (!plantDoc || !plantDoc.isActive) return res.status(400).json({ message: 'Plant not found or inactive' });

  const issue = await Issue.create({
    issueNumber: await nextIssueNumber(),
    style,
    jobSheet,
    plant,
    issuedQuantity: Number(issuedQuantity),
    issueDate: new Date(issueDate),
    expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : undefined,
    remarks,
    issuedBy: req.user._id,
  });

  await logActivity(req, {
    action: 'ISSUE',
    entity: 'Issue',
    entityId: issue._id,
    description: `Issued ${issue.issuedQuantity} pcs of ${sheet.jobSheetNumber} to ${plantDoc.name}`,
    meta: { issueNumber: issue.issueNumber },
  });

  res.status(201).json(issue);
});

/** PUT /api/issues/:id — only quantity correction, remarks, dates and close/reopen. */
exports.update = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue not found' });

  const { issuedQuantity, expectedCompletionDate, remarks, closed } = req.body;

  if (issuedQuantity !== undefined) {
    if (Number(issuedQuantity) < issue.completedQuantity) {
      throw badRequest('Issued quantity cannot be less than the quantity already completed');
    }
    issue.issuedQuantity = Number(issuedQuantity);
  }
  if (expectedCompletionDate !== undefined) {
    issue.expectedCompletionDate = expectedCompletionDate ? new Date(expectedCompletionDate) : undefined;
  }
  if (remarks !== undefined) issue.remarks = remarks;
  if (closed === true) {
    issue.status = 'closed';
  } else if (closed === false || issue.status === 'closed') {
    // Explicit reopen, or an unchanged closed issue stays closed unless reopened.
    issue.status = closed === false ? deriveStatus({ ...issue.toObject(), status: null }) : issue.status;
  } else {
    issue.status = deriveStatus(issue);
  }

  await issue.save();
  await logActivity(req, { action: 'UPDATE', entity: 'Issue', entityId: issue._id, description: `Updated issue ${issue.issueNumber}` });
  res.json(issue);
});

/** DELETE /api/issues/:id — refused if production has been recorded against it. */
exports.remove = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue not found' });

  const hasEntries = await DailyProduction.exists({ issue: issue._id, isDeleted: false });
  if (hasEntries) {
    return res.status(409).json({ message: 'Cannot delete an issue that already has production entries. Close it instead.' });
  }

  await issue.deleteOne();
  await logActivity(req, { action: 'DELETE', entity: 'Issue', entityId: issue._id, description: `Deleted issue ${issue.issueNumber}` });
  res.json({ message: 'Issue deleted' });
});

/** Shared helper used by the production controller to keep totals in sync. */
exports.recalculateIssue = async (issueId) => {
  const agg = await DailyProduction.aggregate([
    { $match: { issue: issueId, isDeleted: false } },
    { $group: { _id: '$issue', total: { $sum: '$completedQuantity' } } },
  ]);
  const completed = agg[0]?.total || 0;

  const issue = await Issue.findById(issueId);
  if (!issue) return null;
  issue.completedQuantity = completed;
  issue.status = deriveStatus(issue);
  await issue.save();
  return issue;
};

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
