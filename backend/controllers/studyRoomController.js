import StudyRoom from '../models/StudyRoom.js';

export const getAllStudyRooms = async (req, res) => {
  try {
    const { course, search, page = 1, limit = 10 } = req.query;
    
    let query = { isPublic: true };
    
    // Filter by course
    if (course) {
      query.course = new RegExp(course, 'i');
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { course: new RegExp(search, 'i') }
      ];
    }

    const studyRooms = await StudyRoom.find(query)
      .populate('createdBy', 'name email university')
      .populate('members.user', 'name university')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await StudyRoom.countDocuments(query);

    res.json({
      studyRooms,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get study rooms error:', error);
    res.status(500).json({
      message: 'Server error while fetching study rooms'
    });
  }
};

export const createStudyRoom = async (req, res) => {
  try {
    const { name, description, course, maxMembers, isPublic, tags, schedule } = req.body;

    const studyRoom = new StudyRoom({
      name,
      description,
      course,
      maxMembers: maxMembers || 20,
      isPublic: isPublic !== undefined ? isPublic : true,
      tags: tags || [],
      schedule: schedule || {},
      createdBy: req.user._id,
      members: [{
        user: req.user._id,
        role: 'admin'
      }]
    });

    await studyRoom.save();

    // Populate the created study room
    await studyRoom.populate('createdBy', 'name email university');
    await studyRoom.populate('members.user', 'name university');

    res.status(201).json({
      message: 'Study room created successfully',
      studyRoom
    });

  } catch (error) {
    console.error('Create study room error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      message: 'Server error while creating study room'
    });
  }
};

export const joinStudyRoom = async (req, res) => {
  try {
    const { id } = req.params;
    
    const studyRoom = await StudyRoom.findById(id);
    
    if (!studyRoom) {
      return res.status(404).json({
        message: 'Study room not found'
      });
    }

    if (!studyRoom.isPublic) {
      // Check if user already requested
      const alreadyRequested = studyRoom.joinRequests.some(
        reqst => reqst.user.toString() === req.user._id.toString()
      );
      
      if (alreadyRequested) {
        return res.status(400).json({ message: 'Join request already pending' });
      }
      
      // Add to join requests
      studyRoom.joinRequests.push({ user: req.user._id });
      await studyRoom.save();
      
      return res.status(200).json({
        message: 'Join request sent to creator',
        pending: true
      });
    }

    // Check if user is already a member
    const isMember = studyRoom.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({
        message: 'You are already a member of this study room'
      });
    }

    // Check room capacity
    if (studyRoom.members.length >= studyRoom.maxMembers) {
      return res.status(400).json({
        message: 'Study room has reached maximum capacity'
      });
    }

    // Add user to members
    studyRoom.members.push({
      user: req.user._id,
      role: 'member'
    });

    // Track activity
    studyRoom.activityLog.push({
      user: req.user._id,
      action: 'join'
    });

    await studyRoom.save();

    // Update user's joined rooms count
    // This would be implemented in user stats update

    res.json({
      message: 'Successfully joined study room',
      studyRoom
    });

  } catch (error) {
    console.error('Join study room error:', error);
    res.status(500).json({
      message: 'Server error while joining study room'
    });
  }
};

export const getStudyRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const studyRoom = await StudyRoom.findById(id)
      .populate('createdBy', 'name email university')
      .populate('members.user', 'name email university');

    if (!studyRoom) {
      return res.status(404).json({
        message: 'Study room not found'
      });
    }

    // Check if user has access to the room
    if (!studyRoom.isPublic) {
      const isMember = studyRoom.members.some(
        member => member.user._id.toString() === req.user._id.toString()
      );
      
      if (!isMember && studyRoom.createdBy._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: 'You do not have access to this study room'
        });
      }
    }

    res.json(studyRoom);

  } catch (error) {
    console.error('Get study room by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid study room ID'
      });
    }
    
    res.status(500).json({
      message: 'Server error while fetching study room details'
    });
  }
};

export const updateStudyRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, course, maxMembers, isPublic, tags, schedule } = req.body;
    
    const studyRoom = await StudyRoom.findById(id);
    
    if (!studyRoom) {
      return res.status(404).json({
        message: 'Study room not found'
      });
    }
    
    // Check if user is the creator or admin
    const isCreator = studyRoom.createdBy.toString() === req.user._id.toString();
    const isAdmin = studyRoom.members.find(member => 
      member.user.toString() === req.user._id.toString() && member.role === 'admin'
    );
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        message: 'You do not have permission to update this study room'
      });
    }
    
    // Update fields
    studyRoom.name = name || studyRoom.name;
    studyRoom.description = description || studyRoom.description;
    studyRoom.course = course || studyRoom.course;
    studyRoom.maxMembers = maxMembers || studyRoom.maxMembers;
    studyRoom.isPublic = isPublic !== undefined ? isPublic : studyRoom.isPublic;
    studyRoom.tags = tags || studyRoom.tags;
    studyRoom.schedule = schedule || studyRoom.schedule;
    studyRoom.updatedAt = new Date();
    
    await studyRoom.save();
    
    // Populate the updated study room
    await studyRoom.populate('createdBy', 'name email university');
    await studyRoom.populate('members.user', 'name university');
    
    res.json({
      message: 'Study room updated successfully',
      studyRoom
    });
    
  } catch (error) {
    console.error('Update study room error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid study room ID'
      });
    }
    
    res.status(500).json({
      message: 'Server error while updating study room'
    });
  }
};

export const deleteStudyRoom = async (req, res) => {
  try {
    const { id } = req.params;
    
    const studyRoom = await StudyRoom.findById(id);
    
    if (!studyRoom) {
      return res.status(404).json({
        message: 'Study room not found'
      });
    }
    
    // Check if user is the creator
    if (studyRoom.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Only the creator can delete this study room'
      });
    }
    
    await StudyRoom.findByIdAndDelete(id);
    
    res.json({
      message: 'Study room deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete study room error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid study room ID'
      });
    }
    
    res.status(500).json({
      message: 'Server error while deleting study room'
    });
  }
};

// End study room session (only creator can end)
export const endStudyRoom = async (req, res) => {
  try {
    const { id } = req.params;
    
    const room = await StudyRoom.findById(id).populate('createdBy', 'name email');
    
    if (!room) {
      return res.status(404).json({ message: 'Study room not found' });
    }
    
    // Check if user is the creator
    if (room.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the room creator can end the study session' });
    }
    
    // Update room status to ended
    room.status = 'ended';
    room.endedAt = new Date();
    await room.save();
    
    res.json({ 
      message: 'Study room session ended successfully',
      room: {
        id: room._id,
        name: room.name,
        status: room.status,
        endedAt: room.endedAt
      }
    });
  } catch (error) {
    console.error('End study room error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid study room ID'
      });
    }
    
    res.status(500).json({
      message: 'Server error while ending study room'
    });
  }
};

// Approve or deny join request
export const handleJoinRequest = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { action } = req.body; // 'approve' or 'deny'
    
    const studyRoom = await StudyRoom.findById(id);
    if (!studyRoom) return res.status(404).json({ message: 'Study room not found' });
    
    // Authorization: Only admin can approve
    const isAdmin = studyRoom.members.some(
      m => m.user.toString() === req.user._id.toString() && m.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ message: 'Unauthorized' });
    
    if (action === 'approve') {
      // Remove from requests
      studyRoom.joinRequests = studyRoom.joinRequests.filter(r => r.user.toString() !== userId);
      // Add to members
      studyRoom.members.push({ user: userId, role: 'member' });
    } else {
      // Deny: Just remove from requests
      studyRoom.joinRequests = studyRoom.joinRequests.filter(r => r.user.toString() !== userId);
    }
    
    await studyRoom.save();
    res.json({ message: `Request ${action}ed successfully` });
    
  } catch (error) {
    res.status(500).json({ message: 'Error handling join request' });
  }
};

// Recommendation logic
export const getRoomRecommendations = async (req, res) => {
  try {
    const userCourses = req.user.enrolledCourses || [];
    
    // Find rooms that match user's courses
    const query = {
      isPublic: true,
      'members.user': { $ne: req.user._id }
    };

    if (userCourses.length > 0) {
      query.course = { $in: userCourses };
    }
    
    const recommended = await StudyRoom.find(query).limit(5);
    
    res.json(recommended);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recommendations' });
  }
};