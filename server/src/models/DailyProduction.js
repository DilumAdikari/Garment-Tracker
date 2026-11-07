const mongoose = require('mongoose');

/**
 * One row per plant report: how many pieces a plant completed and sent out
 * for a given issue on a given date.
 */
const dailyProductionSchema = new mongoose.Schema(
  {
    issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true, index: true },
    plant: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    style: { type: mongoose.Schema.Types.ObjectId, ref: 'Style', required: true, index: true },
    jobSheet: { type: mongoose.Schema.Types.ObjectId, ref: 'JobSheet', required: true, index: true },
    date: { type: Date, required: true, index: true },
    completedQuantity: { type: Number, required: true, min: 0 },
    sentOutQuantity: { type: Number, min: 0, default: 0 },
    remarks: { type: String, trim: true },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// One entry per issue per day; re-entering the same day updates it.
dailyProductionSchema.index({ issue: 1, date: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

module.exports = mongoose.model('DailyProduction', dailyProductionSchema);
