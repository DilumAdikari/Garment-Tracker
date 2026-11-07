/**
 * Builds a Mongo date filter from ?from=YYYY-MM-DD&to=YYYY-MM-DD.
 * `to` is inclusive of the whole day.
 */
function buildDateFilter(query, field = 'date') {
  const { from, to } = query;
  if (!from && !to) return null;

  const filter = {};
  if (from) {
    const start = new Date(from);
    if (Number.isNaN(start.getTime())) throw badRequest('Invalid "from" date');
    start.setHours(0, 0, 0, 0);
    filter.$gte = start;
  }
  if (to) {
    const end = new Date(to);
    if (Number.isNaN(end.getTime())) throw badRequest('Invalid "to" date');
    end.setHours(23, 59, 59, 999);
    filter.$lte = end;
  }
  return { [field]: filter };
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

module.exports = { buildDateFilter, badRequest };
