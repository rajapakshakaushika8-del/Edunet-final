import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    maxlength: [100, 'Subject name cannot be more than 100 characters']
  },
  code: {
    type: String,
    trim: true,
    maxlength: [20, 'Subject code cannot be more than 20 characters'],
    default: null
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters'],
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roomCount: {
    type: Number,
    default: 0
  },
  totalHours: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create compound index for user and name to ensure unique subjects per user
subjectSchema.index({ user: 1, name: 1 }, { unique: true });

// Method to update room count and hours
subjectSchema.methods.updateStats = async function() {
  const StudyRoom = mongoose.model('StudyRoom');
  
  const rooms = await StudyRoom.find({
    subject: this.name,
    'members.user': this.user,
    isActive: true
  });

  this.roomCount = rooms.length;
  this.totalHours = rooms.length * 2; // Estimate 2 hours per room
  
  await this.save();
};

export default mongoose.model('Subject', subjectSchema);