import mongoose from 'mongoose';

const studyRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Study room name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  course: {
    type: String,
    required: [true, 'Course tag is required'],
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    }
  }],
  joinRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    }
  }],
  activityLog: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: String, // 'join', 'leave', 'message', 'resource_upload'
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  maxMembers: {
    type: Number,
    default: 20,
    min: [2, 'Minimum 2 members required'],
    max: [50, 'Maximum 50 members allowed']
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  schedule: {
    day: String,
    time: String,
    frequency: {
      type: String,
      enum: ['once', 'weekly', 'biweekly', 'monthly'],
      default: 'weekly'
    }
  },
  activeSessions: [{
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: Date,
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    duration: Number
  }],
  resources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  }],
  status: {
    type: String,
    enum: ['active', 'ended', 'archived'],
    default: 'active'
  },
  endedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual for member count
studyRoomSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Index for search functionality
studyRoomSchema.index({ name: 'text', description: 'text', course: 'text' });

export default mongoose.model('StudyRoom', studyRoomSchema);