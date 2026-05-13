import mongoose from 'mongoose';

const studySessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  topic: {
    type: String,
    trim: true,
    default: ''
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  startTime: {
    type: String,
    default: ''
  },
  endTime: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    default: 0 // in minutes
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: false
  },
  timerSeconds: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate duration before saving
studySessionSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    try {
      const [startHour, startMin] = this.startTime.split(':').map(Number);
      const [endHour, endMin] = this.endTime.split(':').map(Number);
      
      const startTotalMin = startHour * 60 + startMin;
      const endTotalMin = endHour * 60 + endMin;
      this.duration = Math.max(0, endTotalMin - startTotalMin);
    } catch (e) {
      this.duration = 0;
    }
  } else {
    this.duration = 0;
  }
  this.updatedAt = new Date();
  next();
});

const StudySession = mongoose.model('StudySession', studySessionSchema);
export default StudySession;
