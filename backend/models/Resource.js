import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Resource title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  file: {
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    path: String,
    url: String
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: String,
    required: [true, 'Course tag is required'],
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  type: {
    type: String,
    enum: ['notes', 'past-paper', 'presentation', 'video', 'other'],
    required: true
  },
  university: {
    type: String,
    required: true
  },
  faculty: {
    type: String,
    required: true
  },
  year: {
    type: String,
    required: true
  },
  downloads: {
    type: Number,
    default: 0
  },
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  reports: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Calculate average rating before saving
resourceSchema.pre('save', function(next) {
  if (this.ratings.length > 0) {
    const total = this.ratings.reduce((sum, rating) => sum + rating.rating, 0);
    this.averageRating = total / this.ratings.length;
  }
  next();
});

// Index for search functionality
resourceSchema.index({ title: 'text', description: 'text', course: 'text', tags: 'text' });

export default mongoose.model('Resource', resourceSchema);