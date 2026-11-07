const mongoose = require('mongoose');

const jobSheetSchema = new mongoose.Schema(
  {
    jobSheetNumber: { type: String, required: true, trim: true, uppercase: true, unique: true },
    style: { type: mongoose.Schema.Types.ObjectId, ref: 'Style', required: true, index: true },
    color: { type: String, trim: true },
    sizeBreakdown: { type: Map, of: Number }, // e.g. { S: 100, M: 200, L: 150 }
    targetQuantity: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true },
    isClosed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobSheet', jobSheetSchema);
