import StudySession from '../models/StudySession.js';

export const createSession = async (req, res) => {
  try {
    const { subject, topic, date, startTime, endTime, notes } = req.body;

    if (!subject || !date) {
      return res.status(400).json({
        message: 'Subject and date are required'
      });
    }

    // Parse date - handle both string and date formats
    let parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        message: 'Invalid date format'
      });
    }

    const session = new StudySession({
      user: req.user._id,
      subject: subject.trim(),
      topic: (topic || '').trim(),
      date: parsedDate,
      startTime: startTime || '',
      endTime: endTime || '',
      notes: (notes || '').trim()
    });

    await session.save();

    res.status(201).json({
      message: 'Study session created successfully',
      data: session
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      message: 'Error creating study session',
      error: error.message
    });
  }
};

export const getSessions = async (req, res) => {
  try {
    const sessions = await StudySession.find({ user: req.user._id })
      .sort({ date: -1 });

    res.status(200).json({
      message: 'Sessions retrieved successfully',
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving sessions',
      error: error.message
    });
  }
};

export const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await StudySession.findOne({
      _id: id,
      user: req.user._id
    });

    if (!session) {
      return res.status(404).json({
        message: 'Session not found'
      });
    }

    res.status(200).json({
      message: 'Session retrieved successfully',
      data: session
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving session',
      error: error.message
    });
  }
};

export const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, topic, date, startTime, endTime, notes, timerSeconds, isActive } = req.body;

    const session = await StudySession.findOne({
      _id: id,
      user: req.user._id
    });

    if (!session) {
      return res.status(404).json({
        message: 'Session not found'
      });
    }

    // Update fields with proper type handling
    if (subject) session.subject = subject.trim();
    if (topic !== undefined) session.topic = (topic || '').trim();
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        session.date = parsedDate;
      }
    }
    if (startTime !== undefined) session.startTime = startTime || '';
    if (endTime !== undefined) session.endTime = endTime || '';
    if (notes !== undefined) session.notes = (notes || '').trim();
    if (timerSeconds !== undefined) session.timerSeconds = timerSeconds;
    if (isActive !== undefined) session.isActive = isActive;

    await session.save();

    res.status(200).json({
      message: 'Session updated successfully',
      data: session
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      message: 'Error updating session',
      error: error.message
    });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await StudySession.findOneAndDelete({
      _id: id,
      user: req.user._id
    });

    if (!session) {
      return res.status(404).json({
        message: 'Session not found'
      });
    }

    res.status(200).json({
      message: 'Session deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting session',
      error: error.message
    });
  }
};

export const getSessionStats = async (req, res) => {
  try {
    const sessions = await StudySession.find({ user: req.user._id });

    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((acc, session) => acc + (session.duration || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySessions = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });

    const upcomingSessions = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= today;
    }).length;

    res.status(200).json({
      message: 'Session stats retrieved successfully',
      data: {
        totalSessions,
        totalHours,
        todaysSessions: todaySessions.length,
        upcomingSessions
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving session stats',
      error: error.message
    });
  }
};
