import Resource from '../models/Resource.js';
import User from '../models/User.js';

// Get all resources with filtering and search
export const getAllResources = async (req, res) => {
  try {
    const { 
      search, 
      course, 
      type, 
      university, 
      faculty, 
      year,
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = { isApproved: true };

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Filters
    if (course && course !== 'All') {
      query.course = new RegExp(course, 'i');
    }

    if (type && type !== 'All') {
      query.type = type;
    }

    if (university) {
      query.university = new RegExp(university, 'i');
    }

    if (faculty) {
      query.faculty = new RegExp(faculty, 'i');
    }

    if (year) {
      query.year = year;
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const resources = await Resource.find(query)
      .populate('uploadedBy', 'name university faculty')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Resource.countDocuments(query);

    res.json({
      resources,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    });

  } catch (error) {
    console.error('Get all resources error:', error);
    res.status(500).json({
      message: 'Server error while fetching resources'
    });
  }
};

// Get resource by ID
export const getResourceById = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await Resource.findById(id)
      .populate('uploadedBy', 'name university faculty')
      .populate('ratings.user', 'name');

    if (!resource) {
      return res.status(404).json({
        message: 'Resource not found'
      });
    }

    res.json(resource);

  } catch (error) {
    console.error('Get resource by ID error:', error);
    res.status(500).json({
      message: 'Server error while fetching resource'
    });
  }
};

// Upload new resource
export const uploadResource = async (req, res) => {
  try {
    const { title, description, course, tags, type } = req.body;

    if (!title || !course || !type) {
      return res.status(400).json({
        message: 'Title, course, and type are required'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Handle file upload (if file exists)
    let fileData = {};
    if (req.file) {
      fileData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: `/uploads/${req.file.filename}`
      };
    }

    const resource = new Resource({
      title: title.trim(),
      description: description ? description.trim() : '',
      course: course.trim(),
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      type,
      uploadedBy: req.user._id,
      university: user.university,
      faculty: user.faculty,
      year: user.year,
      file: Object.keys(fileData).length > 0 ? fileData : undefined,
      isApproved: true // Auto-approve for now
    });

    await resource.save();

    // Update user's shared resources count
    await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { 'studyStats.sharedResources': 1 } }
    );

    // Populate the created resource
    await resource.populate('uploadedBy', 'name university faculty');

    res.status(201).json({
      message: 'Resource uploaded successfully',
      resource
    });

  } catch (error) {
    console.error('Upload resource error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: messages[0] || 'Validation failed'
      });
    }

    res.status(500).json({
      message: 'Server error while uploading resource'
    });
  }
};

// Download resource
export const downloadResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await Resource.findById(id);

    if (!resource) {
      return res.status(404).json({
        message: 'Resource not found'
      });
    }

    if (!resource.file || !resource.file.path) {
      return res.status(404).json({
        message: 'File not found'
      });
    }

    // Increment download count
    await Resource.findByIdAndUpdate(id, { $inc: { downloads: 1 } });

    // Send file
    res.download(resource.file.path, resource.file.originalName);

  } catch (error) {
    console.error('Download resource error:', error);
    res.status(500).json({
      message: 'Server error while downloading resource'
    });
  }
};

// Rate resource
export const rateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: 'Rating must be between 1 and 5'
      });
    }

    const resource = await Resource.findById(id);

    if (!resource) {
      return res.status(404).json({
        message: 'Resource not found'
      });
    }

    // Check if user already rated this resource
    const existingRatingIndex = resource.ratings.findIndex(
      r => r.user.toString() === req.user._id.toString()
    );

    if (existingRatingIndex !== -1) {
      // Update existing rating
      resource.ratings[existingRatingIndex].rating = rating;
      resource.ratings[existingRatingIndex].review = review || '';
    } else {
      // Add new rating
      resource.ratings.push({
        user: req.user._id,
        rating,
        review: review || ''
      });
    }

    await resource.save();

    res.json({
      message: 'Rating submitted successfully',
      averageRating: resource.averageRating
    });

  } catch (error) {
    console.error('Rate resource error:', error);
    res.status(500).json({
      message: 'Server error while rating resource'
    });
  }
};

// Get user's uploaded resources
export const getUserResources = async (req, res) => {
  try {
    const resources = await Resource.find({ 
      uploadedBy: req.user._id 
    })
    .sort({ createdAt: -1 })
    .lean();

    res.json(resources);

  } catch (error) {
    console.error('Get user resources error:', error);
    res.status(500).json({
      message: 'Server error while fetching user resources'
    });
  }
};

// Delete resource (only by uploader or admin)
export const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await Resource.findById(id);

    if (!resource) {
      return res.status(404).json({
        message: 'Resource not found'
      });
    }

    // Check if user is the uploader
    if (resource.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only delete your own resources'
      });
    }

    await Resource.findByIdAndDelete(id);

    // Decrement user's shared resources count
    await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { 'studyStats.sharedResources': -1 } }
    );

    res.json({
      message: 'Resource deleted successfully'
    });

  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({
      message: 'Server error while deleting resource'
    });
  }
};

// Report resource
export const reportResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ message: 'Reason is required' });

    const resource = await Resource.findById(id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    resource.reports.push({
      user: req.user._id,
      reason
    });

    await resource.save();
    res.json({ message: 'Resource reported successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Error reporting resource' });
  }
};