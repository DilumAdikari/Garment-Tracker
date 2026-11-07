const mongoose = require('mongoose');

const styleSchema = new mongoose.Schema(
  {
    styleNumber: { type: String, required: true, trim: true, uppercase: true, unique: true },
    description: { type: String, trim: true },
    buyer: { type: String, trim: true },
    season: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

styleSchema.index({ styleNumber: 'text', description: 'text', buyer: 'text' });

module.exports = mongoose.model('Style', styleSchema);
