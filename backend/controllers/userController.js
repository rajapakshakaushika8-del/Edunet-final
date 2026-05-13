import User from '../models/User.js';
import StudyRoom from '../models/StudyRoom.js';
import Subject from '../models/Subject.js';
import Resource from '../models/Resource.js';
import StudySession from '../models/StudySession.js';

export const getStudyStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Get real data from database
    const joinedRooms = await StudyRoom.countDocuments({
      'members.user': req.user._id
    });

    // Get active study rooms count
    const activeRooms = await StudyRoom.countDocuments({
      'members.user': req.user._id,
      status: 'active'
    });

    // Get user's created rooms count
    const createdRooms = await StudyRoom.countDocuments({
      createdBy: req.user._id
    });

    // Calculate study stats from user's study sessions
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);

    // Get user's actual study sessions from last week
    const recentSessions = await StudySession.find({
      user: req.user._id,
      $or: [
        { date: { $gte: oneWeekAgo } },
        { createdAt: { $gte: oneWeekAgo } }
      ]
    });

    // Calculate real study hours based on session duration
    const recentMinutes = recentSessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const studyHours = Number((recentMinutes / 60).toFixed(1));

    // Get user's study stats or initialize with defaults
    const studyStats = user.studyStats || {};
    
    // For "completed today" stats
    const today = new Date().toDateString();
    const todaySessions = recentSessions.filter(session => {
        const d = new Date(session.date || session.createdAt);
        return d.toDateString() === today;
    }).length;

    const updatedStats = {
      studyHours: studyHours || 0,
      joinedRooms,
      activeRooms,
      createdRooms,
      sharedResources: studyStats.sharedResources || 0,
      completedSessions: recentSessions.length, // total completed this week or overall depending on definition, let's keep it as this week
      weeklyGrowth: studyHours > 0 ? Math.round(((studyHours / (studyStats.lastWeekHours || 1)) - 1) * 100) : 0,
      monthlyRooms: Math.max(joinedRooms - (studyStats.lastMonthRooms || 0), 0),
      weeklyResources: Math.max(studyStats.sharedResources - (studyStats.lastWeekResources || 0), 0),
      todaySessions: todaySessions
    };

    // Update user's study stats for future calculations
    await User.findByIdAndUpdate(req.user._id, {
      'studyStats.lastWeekHours': studyHours,
      'studyStats.lastMonthRooms': joinedRooms,
      'studyStats.lastWeekResources': studyStats.sharedResources,
      'studyStats.lastUpdated': new Date()
    });

    res.json(updatedStats);

  } catch (error) {
    console.error('Get study stats error:', error);
    res.status(500).json({
      message: 'Server error while fetching study stats'
    });
  }
};

export const getUserStudyRooms = async (req, res) => {
  try {
    const studyRooms = await StudyRoom.find({
      'members.user': req.user._id
    })
    .populate('createdBy', 'name email university')
    .populate('members.user', 'name university')
    .sort({ updatedAt: -1 });

    res.json(studyRooms);

  } catch (error) {
    console.error('Get user study rooms error:', error);
    res.status(500).json({
      message: 'Server error while fetching study rooms'
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email, university, faculty, year, gpa } = req.body;
    const userId = req.user._id;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          message: 'Email is already registered to another account'
        });
      }
    }

    // Update user profile
    const updateData = {
      ...(name && { name: name.trim() }),
      ...(email && { email: email.toLowerCase() }),
      ...(university && { university: university.trim() }),
      ...(faculty && { faculty: faculty.trim() }),
      ...(year && { year }),
      ...(gpa !== undefined && { gpa: gpa ? parseFloat(gpa) : null })
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json(updatedUser);

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: messages[0] || 'Validation failed'
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Email is already registered'
      });
    }
    
    res.status(500).json({
      message: 'Server error while updating profile'
    });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Get all user's study rooms for analysis
    const allStudyRooms = await StudyRoom.find({
      'members.user': req.user._id
    })
    .populate('createdBy', 'name')
    .sort({ updatedAt: -1 });

    // Get recent study rooms for display
    const userStudyRooms = allStudyRooms.slice(0, 5);

    // Get actual user study sessions for real study data
    const userSessions = await StudySession.find({ user: req.user._id });

    // Calculate real study data by subject based on user's actual study sessions
    const subjectHours = {};
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#ef4444', '#06b6d4'];
    let colorIndex = 0;

    userSessions.forEach(session => {
      const subject = session.subject || 'General Studies';
      if (!subjectHours[subject]) {
        subjectHours[subject] = {
          hours: 0,
          color: colors[colorIndex % colors.length]
        };
        colorIndex++;
      }
      subjectHours[subject].hours += (session.duration || 0) / 60; // minutes to hours
    });

    const studyData = Object.entries(subjectHours).map(([name, data]) => ({
      name,
      hours: Number(data.hours.toFixed(1)),
      color: data.color
    }));

    if (studyData.length === 0) {
      studyData.push({ name: 'No Study Data', hours: 0, color: '#6b7280' });
    }

    // Calculate real weekly progress based on StudySession dates
    const weeklyProgress = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      
      const daySessions = userSessions.filter(session => {
        const sessionDate = new Date(session.date || session.createdAt);
        return sessionDate.toDateString() === dayDate.toDateString();
      });

      const dayMinutes = daySessions.reduce((acc, current) => acc + (current.duration || 0), 0);
      weeklyProgress.push({
        day: days[i],
        hours: Number((dayMinutes / 60).toFixed(1))
      });
    }

    // Get user's subjects for performance calculation
    const userSubjects = await Subject.find({ 
      user: req.user._id, 
      isActive: true 
    }).sort({ createdAt: -1 });

    // Calculate performance data based on user's subjects and actual study sessions
    const performanceData = [];
    
    if (userSubjects.length > 0) {
      for (const subject of userSubjects.slice(0, 5)) {
        // Find user's sessions for this subject
        const subjectSessions = userSessions.filter(s => s.subject === subject.name || s.subject === subject.code);
        
        // Find recent sessions (last 7 days)
        const recentSessions = subjectSessions.filter(s => 
          new Date(s.date || s.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        
        const totalMinutes = subjectSessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        const recentMinutes = recentSessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        
        // Calculate abstract "score" based on total study time and recent consistency
        // Base score increases with total study time (cap at 60)
        const baseScore = Math.min((totalMinutes / 60) * 5 + 40, 60); 
        // Bonus score for recent activity (up to 40)
        const activityBonus = Math.min((recentMinutes / 60) * 10, 40);
        
        performanceData.push({
          subject: subject.name.length > 10 ? subject.name.substring(0, 10) : subject.name,
          score: Math.min(Math.round(baseScore + activityBonus), 100)
        });
      }
    } else {
      // If user has no explicit subjects, show performance based on subjects derived from active sessions
      const uniqueSessionSubjects = [...new Set(userSessions.map(s => s.subject).filter(Boolean))];
      for (const subjectName of uniqueSessionSubjects.slice(0, 5)) {
        const subjectSessions = userSessions.filter(s => s.subject === subjectName);
        const recentSessions = subjectSessions.filter(s => 
          new Date(s.date || s.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        
        const totalMinutes = subjectSessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        const recentMinutes = recentSessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        
        const baseScore = Math.min((totalMinutes / 60) * 5 + 40, 60);
        const activityBonus = Math.min((recentMinutes / 60) * 10, 40);
        
        performanceData.push({
          subject: subjectName.length > 10 ? subjectName.substring(0, 10) : subjectName,
          score: Math.min(Math.round(baseScore + activityBonus), 100)
        });
      }
    }

    // If no performance data at all
    if (performanceData.length === 0) {
      performanceData.push({ subject: 'No Data', score: 0 });
    }

    res.json({
      studyRooms: userStudyRooms,
      studyData,
      weeklyProgress,
      performanceData,
      summary: {
        totalRooms: allStudyRooms.length,
        totalSubjects: userSubjects.length,
        totalHours: studyData.reduce((sum, item) => sum + item.hours, 0),
        activeThisWeek: allStudyRooms.filter(room => 
          new Date(room.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length
      }
    });

  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      message: 'Server error while fetching dashboard data'
    });
  }
};

// Subject Management
export const getUserSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ 
      user: req.user._id,
      isActive: true 
    }).sort({ createdAt: -1 });

    // Update stats for each subject
    for (const subject of subjects) {
      await subject.updateStats();
    }

    res.json(subjects);

  } catch (error) {
    console.error('Get user subjects error:', error);
    res.status(500).json({
      message: 'Server error while fetching subjects'
    });
  }
};

export const addSubject = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'Subject name is required'
      });
    }

    // Check if subject already exists for this user
    const existingSubject = await Subject.findOne({
      user: req.user._id,
      name: name.trim(),
      isActive: true
    });

    if (existingSubject) {
      return res.status(400).json({
        message: 'Subject with this name already exists'
      });
    }

    const subject = new Subject({
      name: name.trim(),
      code: code ? code.trim() : null,
      description: description ? description.trim() : null,
      user: req.user._id
    });

    await subject.save();
    await subject.updateStats();

    res.status(201).json(subject);

  } catch (error) {
    console.error('Add subject error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Subject with this name already exists'
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: messages[0] || 'Validation failed'
      });
    }
    
    res.status(500).json({
      message: 'Server error while adding subject'
    });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { name, code, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'Subject name is required'
      });
    }

    const subject = await Subject.findOne({
      _id: subjectId,
      user: req.user._id,
      isActive: true
    });

    if (!subject) {
      return res.status(404).json({
        message: 'Subject not found'
      });
    }

    // Check if another subject with this name exists
    const existingSubject = await Subject.findOne({
      user: req.user._id,
      name: name.trim(),
      _id: { $ne: subjectId },
      isActive: true
    });

    if (existingSubject) {
      return res.status(400).json({
        message: 'Subject with this name already exists'
      });
    }

    // Update subject
    subject.name = name.trim();
    subject.code = code ? code.trim() : null;
    subject.description = description ? description.trim() : null;

    await subject.save();
    await subject.updateStats();

    res.json(subject);

  } catch (error) {
    console.error('Update subject error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Subject with this name already exists'
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: messages[0] || 'Validation failed'
      });
    }
    
    res.status(500).json({
      message: 'Server error while updating subject'
    });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const subject = await Subject.findOne({
      _id: subjectId,
      user: req.user._id,
      isActive: true
    });

    if (!subject) {
      return res.status(404).json({
        message: 'Subject not found'
      });
    }

    // Soft delete - mark as inactive
    subject.isActive = false;
    await subject.save();

    res.json({
      message: 'Subject deleted successfully'
    });

  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({
      message: 'Server error while deleting subject'
    });
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user subjects
    const userSubjects = await Subject.find({ user: req.user._id, isActive: true });
    const subjectNames = userSubjects.map(s => s.name);

    // Recommend Study Rooms: match subjects, university, and exclude already joined
    const recommendedRooms = await StudyRoom.find({
      'members.user': { $ne: req.user._id },
      $or: [
        { course: { $in: subjectNames } },
        { university: user.university }
      ]
    }).limit(6).populate('createdBy', 'name');

    // Recommend Resources: match subjects
    const recommendedResources = await Resource.find({
      subject: { $in: subjectNames }
    }).limit(6).populate('uploader', 'name');

    res.json({
      rooms: recommendedRooms,
      resources: recommendedResources
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ message: 'Server error while fetching recommendations' });
  }
};

export const getActivityReport = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const joinedRooms = await StudyRoom.find({ 'members.user': req.user._id });
    const userSessions = await StudySession.find({ user: req.user._id });
    
    // Group durations by month for real-time monthly breakdown
    const monthlyDataMap = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    userSessions.forEach(session => {
      const d = new Date(session.date || session.createdAt);
      const month = monthNames[d.getMonth()];
      if (!monthlyDataMap[month]) monthlyDataMap[month] = 0;
      monthlyDataMap[month] += (session.duration || 0);
    });

    // Populate monthly breakdown array up to current month (last 6 months dynamically)
    const currentMonthIdx = new Date().getMonth();
    const monthlyBreakdown = [];
    for (let i = 5; i >= 0; i--) {
      let mIdx = currentMonthIdx - i;
      if (mIdx < 0) mIdx += 12;
      const mName = monthNames[mIdx];
      monthlyBreakdown.push({
        month: mName,
        hours: Number(((monthlyDataMap[mName] || 0) / 60).toFixed(1))
      });
    }

    // Dynamic Strengths/Weaknesses calculation based on session data
    const totalMinutes = userSessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const totalHours = Number((totalMinutes / 60).toFixed(1));

    const strengths = [];
    const areasForImprovement = [];

    if (totalHours > 20) {
      strengths.push('Highly dedicated learner');
    } else {
      areasForImprovement.push('Try to increase total study hours');
    }

    if (joinedRooms.length > 3) {
      strengths.push('Active participant in group sessions');
    } else {
      areasForImprovement.push('Join more study rooms to collaborate');
    }

    const resourcesShared = await Resource.countDocuments({ uploader: req.user._id });
    if (resourcesShared > 5) {
      strengths.push('Excellent resource contributor');
    } else {
      areasForImprovement.push('Share more materials with peers');
    }

    if (strengths.length === 0) strengths.push('Starting your journey towards excellence');
    if (areasForImprovement.length === 0) areasForImprovement.push('Keep up the good work');

    const reportData = {
      totalHours: totalHours,
      totalRooms: joinedRooms.length,
      totalResources: resourcesShared,
      monthlyBreakdown: monthlyBreakdown,
      strengths: strengths,
      areasForImprovement: areasForImprovement
    };

    res.json(reportData);
  } catch (error) {
    console.error('Activity report error:', error);
    res.status(500).json({ message: 'Server error while generating report' });
  }
};

// Peer Suggestions logic
export const getPeerSuggestions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const userCourses = user.enrolledCourses || [];
    if (userCourses.length === 0) {
      return res.json([]); // No courses, no specific suggestions
    }

    // Find users with same courses, excluding current user
    const suggestedPeers = await User.find({
      _id: { $ne: req.user._id },
      enrolledCourses: { $in: userCourses },
      isActive: true
    })
    .select('name university faculty year enrolledCourses avatar')
    .limit(10);

    res.json(suggestedPeers);
  } catch (error) {
    console.error('Peer suggestions error:', error);
    res.status(500).json({ message: 'Server error while fetching peer suggestions' });
  }
};