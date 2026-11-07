const mongoose = require('mongoose');

/**
 * An Issue records cut pieces handed from the company to a production plant.
 * `completedQuantity` and `pendingQuantity` are denormalised totals kept in
 * sync by the DailyProduction controller so dashboards stay fast.
 */
const issueSchema = new mongoose.Schema(
  {
    issueNumber: { type: String, unique: true, index: true }, // auto-generated, e.g. ISS-000123
    style: { type: mongoose.Schema.Types.ObjectId, ref: 'Style', required: true, index: true },
    jobSheet: { type: mongoose.Schema.Types.ObjectId, ref: 'JobSheet', required: true, index: true },
    plant: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    issuedQuantity: { type: Number, required: true, min: 1 },
    completedQuantity: { type: Number, default: 0, min: 0 },
    issueDate: { type: Date, required: true, index: true },
    expectedCompletionDate: Date,
    status: {
      type: String,
      enum: ['issued', 'in_progress', 'completed', 'closed'],
      default: 'issued',
      index: true,
    },
    remarks: { type: String, trim: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

issueSchema.virtual('pendingQuantity').get(function pendingQuantity() {
  return Math.max(this.issuedQuantity - this.completedQuantity, 0);
});

issueSchema.set('toJSON', { virtuals: true });
issueSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Issue', issueSchema);
