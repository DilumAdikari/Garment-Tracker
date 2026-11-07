const logActivity = require('../utils/activityLogger');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Builds list / get / create / update / remove handlers for a simple model.
 * Options:
 *   model        - Mongoose model
 *   name         - human label used in logs and messages, e.g. 'Plant'
 *   searchFields - fields matched by the ?search= query parameter
 *   populate     - optional populate spec for list/get
 *   inUseCheck   - async (doc) => boolean; blocks deletion when true
 */
function createCrud({ model, name, searchFields = [], populate, inUseCheck, sort = { createdAt: -1 } }) {
  const escape = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const list = asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.active === 'true') filter.isActive = true;
    if (req.query.search && searchFields.length) {
      const term = new RegExp(escape(req.query.search.trim()), 'i');
      filter.$or = searchFields.map((f) => ({ [f]: term }));
    }
    let q = model.find(filter).sort(sort);
    if (populate) q = q.populate(populate);
    const items = await q;
    res.json({ items, total: items.length });
  });

  const getOne = asyncHandler(async (req, res) => {
    let q = model.findById(req.params.id);
    if (populate) q = q.populate(populate);
    const doc = await q;
    if (!doc) return res.status(404).json({ message: `${name} not found` });
    res.json(doc);
  });

  const create = asyncHandler(async (req, res) => {
    const doc = await model.create(req.body);
    await logActivity(req, { action: 'CREATE', entity: name, entityId: doc._id, description: `Created ${name.toLowerCase()} "${doc.name || doc.styleNumber || doc.jobSheetNumber || doc.username}"` });
    res.status(201).json(doc);
  });

  const update = asyncHandler(async (req, res) => {
    const doc = await model.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: `${name} not found` });
    // Protect immutable identifiers that other records depend on.
    const { _id, createdAt, ...changes } = req.body;
    Object.assign(doc, changes);
    await doc.save();
    await logActivity(req, { action: 'UPDATE', entity: name, entityId: doc._id, description: `Updated ${name.toLowerCase()}` });
    res.json(doc);
  });

  const remove = asyncHandler(async (req, res) => {
    const doc = await model.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: `${name} not found` });
    if (inUseCheck && (await inUseCheck(doc))) {
      return res.status(409).json({ message: `This ${name.toLowerCase()} is in use and cannot be deleted. Deactivate it instead.` });
    }
    await doc.deleteOne();
    await logActivity(req, { action: 'DELETE', entity: name, entityId: doc._id, description: `Deleted ${name.toLowerCase()}` });
    res.json({ message: `${name} deleted` });
  });

  return { list, getOne, create, update, remove };
}

module.exports = createCrud;
