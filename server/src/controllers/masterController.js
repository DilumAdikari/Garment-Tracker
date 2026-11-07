const Plant = require('../models/Plant');
const Style = require('../models/Style');
const JobSheet = require('../models/JobSheet');
const Issue = require('../models/Issue');
const User = require('../models/User');
const createCrud = require('./crudFactory');
const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/activityLogger');

exports.plants = createCrud({
  model: Plant,
  name: 'Plant',
  searchFields: ['name', 'code', 'location'],
  sort: { name: 1 },
  inUseCheck: (plant) => Issue.exists({ plant: plant._id }),
});

exports.styles = createCrud({
  model: Style,
  name: 'Style',
  searchFields: ['styleNumber', 'description', 'buyer'],
  sort: { styleNumber: 1 },
  inUseCheck: (style) => Issue.exists({ style: style._id }),
});

exports.jobSheets = createCrud({
  model: JobSheet,
  name: 'JobSheet',
  searchFields: ['jobSheetNumber', 'color'],
  populate: { path: 'style', select: 'styleNumber description' },
  sort: { createdAt: -1 },
  inUseCheck: (sheet) => Issue.exists({ jobSheet: sheet._id }),
});

// Job sheets are looked up by style in the issue form, so offer a filtered list too.
exports.jobSheetsByStyle = asyncHandler(async (req, res) => {
  const sheets = await JobSheet.find({ style: req.params.styleId, isClosed: false })
    .select('jobSheetNumber color targetQuantity')
    .sort({ jobSheetNumber: 1 });
  res.json({ items: sheets, total: sheets.length });
});

/* ---------- Users (admin only) ---------- */

exports.listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ items: users, total: users.length });
});

exports.createUser = asyncHandler(async (req, res) => {
  const { name, username, password, role } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ message: 'Name, username and password are required' });
  }
  const user = await User.create({ name, username, password, role: role || 'operator' });
  await logActivity(req, { action: 'CREATE', entity: 'User', entityId: user._id, description: `Created user ${user.username} (${user.role})` });
  res.status(201).json(user);
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  const { name, role, isActive, password } = req.body;

  // Prevent an admin from locking themselves out.
  const isSelf = String(user._id) === String(req.user._id);
  if (isSelf && ((role && role !== 'admin') || isActive === false)) {
    return res.status(400).json({ message: 'You cannot demote or deactivate your own account' });
  }

  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (password) user.password = password;

  await user.save();
  await logActivity(req, { action: 'UPDATE', entity: 'User', entityId: user._id, description: `Updated user ${user.username}` });
  res.json(user);
});
