import User from '../models/User.js';
import StudyRoom from '../models/StudyRoom.js';
import Resource from '../models/Resource.js';
import ModerationLog from '../models/ModerationLog.js';

// Get platform statistics
export const getPlatformStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalRooms = await StudyRoom.countDocuments();
    const totalResources = await Resource.countDocuments();
    
    // Active rooms (last 24h)
    const activeRooms = await StudyRoom.countDocuments({
      updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      totalUsers,
      totalRooms,
      totalResources,
      activeRooms
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching platform stats' });
  }
};

// Get reported content
export const getReportedContent = async (req, res) => {
  try {
    const reportedResources = await Resource.find({ 'reports.0': { $exists: true } })
      .populate('uploadedBy', 'name email');
    
    res.json({ resources: reportedResources });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reports' });
  }
};

// Delete resource and log it
export const deleteResourceAdmin = async (req, res) => {
  try {
    const { resourceId, reason } = req.body;
    
    const resource = await Resource.findById(resourceId);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    await Resource.findByIdAndDelete(resourceId);

    const log = new ModerationLog({
      moderator: req.user._id,
      action: 'delete_resource',
      targetType: 'Resource',
      targetId: resourceId,
      reason
    });
    await log.save();

    res.json({ message: 'Resource deleted and logged' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting resource' });
  }
};

// Suspend user
export const toggleUserAccess = async (req, res) => {
  try {
    const { userId, isActive, reason } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isActive = isActive; // Assuming User model has isActive
    await user.save();

    const log = new ModerationLog({
      moderator: req.user._id,
      action: isActive ? 'unsuspend_user' : 'suspend_user',
      targetType: 'User',
      targetId: userId,
      reason
    });
    await log.save();

    res.json({ message: `User access toggled to ${isActive}` });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling user access' });
  }
};
