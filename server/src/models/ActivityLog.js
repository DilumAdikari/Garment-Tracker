const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    username: String,
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN',
        'CREATE',
        'UPDATE',
        'DELETE',
        'ISSUE',
        'PRODUCTION_ENTRY',
        'PRODUCTION_UPDATE',
        'PRODUCTION_DELETE',
        'EXPORT',
      ],
    },
    entity: { type: String, required: true }, // e.g. 'Issue', 'Plant', 'User'
    entityId: String,
    description: String,
    meta: mongoose.Schema.Types.Mixed,
    ipAddress: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
