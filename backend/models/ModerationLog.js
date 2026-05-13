import mongoose from 'mongoose';

const moderationLogSchema = new mongoose.Schema({
  moderator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['delete_resource', 'suspend_user', 'unsuspend_user', 'remove_participant', 'delete_room'],
    required: true
  },
  targetType: {
    type: String,
    enum: ['User', 'Resource', 'StudyRoom'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  reason: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('ModerationLog', moderationLogSchema);
