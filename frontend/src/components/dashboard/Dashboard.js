import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Book, Users, FileText, TrendingUp, Clock, Award, BookOpen, Settings, Plus, Edit } from 'lucide-react';
import ProfileEdit from './ProfileEdit';
import SubjectManager from './SubjectManager';
import RecommendationsWidget from './RecommendationsWidget';
import './Dashboard.css';

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentRooms, setRecentRooms] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    studyData: [],
    weeklyProgress: [],
    performanceData: []
  });
  const [loading, setLoading] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showSubjectManager, setShowSubjectManager] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, dashboardResponse] = await Promise.all([
        userAPI.getStudyStats(),
        userAPI.getDashboardData()
      ]);
      
      setStats(statsResponse.data);
      
      const { studyRooms, studyData, weeklyProgress, performanceData, summary } = dashboardResponse.data;
      setRecentRooms(studyRooms || []);
      setDashboardData({
        studyData: studyData || [],
        weeklyProgress: weeklyProgress || [],
        performanceData: performanceData || [],
        summary: summary || {}
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // If API fails completely, show empty state
      setStats({
        studyHours: 0,
        joinedRooms: 0,
        activeRooms: 0,
        createdRooms: 0,
        sharedResources: 0,
        completedSessions: 0
      });
      setRecentRooms([]);
      setDashboardData({
        studyData: [],
        weeklyProgress: [],
        performanceData: [],
        summary: {
          totalRooms: 0,
          totalSubjects: 0,
          totalHours: 0,
          activeThisWeek: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <div className="header-content">
            <div>
              <h1 className="dashboard-title">
                Welcome back, <span className="gradient-text">{user?.name}!</span>
              </h1>
              <p className="dashboard-subtitle">Track your learning progress and achieve your goals</p>
            </div>
            <div className="header-actions">
              <button 
                onClick={() => setShowSubjectManager(true)}
                className="btn btn-secondary"
              >
                <Plus size={18} />
                Manage Subjects
              </button>
              <button 
                onClick={() => setShowProfileEdit(true)}
                className="btn btn-outline"
              >
                <Edit size={18} />
                Edit Profile
              </button>
              <Link to="/study-rooms" className="btn btn-primary">
                <Users size={18} />
                Join Study Room
              </Link>
            </div>
          </div>
        </div>

        {/* Modern Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-primary">
            <div className="stat-icon">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats?.studyHours || 0}</h3>
              <p>Study Hours This Week</p>
              <span className="stat-change positive">
                {stats?.weeklyGrowth > 0 ? `+${stats.weeklyGrowth}%` : stats?.weeklyGrowth < 0 ? `${stats.weeklyGrowth}%` : 'No change'} from last week
              </span>
            </div>
          </div>
          <div className="stat-card stat-secondary">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats?.joinedRooms || 0}</h3>
              <p>Study Rooms Joined</p>
              <span className="stat-change positive">
                {stats?.monthlyRooms > 0 ? `+${stats.monthlyRooms} new this month` : 'No new rooms'}
              </span>
            </div>
          </div>
          <div className="stat-card stat-tertiary">
            <div className="stat-icon">
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats?.sharedResources || 0}</h3>
              <p>Resources Shared</p>
              <span className="stat-change positive">
                {stats?.weeklyResources > 0 ? `+${stats.weeklyResources} this week` : 'No new resources'}
              </span>
            </div>
          </div>
          <div className="stat-card stat-accent">
            <div className="stat-icon">
              <Award size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats?.completedSessions || 0}</h3>
              <p>Study Sessions</p>
              <span className="stat-change positive">
                {stats?.todaySessions > 0 ? `+${stats.todaySessions} completed today` : 'No sessions today'}
              </span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-grid">
          {/* Study Time Distribution Pie Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Study Time by Subject</h3>
              <p>This week's distribution</p>
            </div>
            <div className="chart-container">
              {dashboardData.studyData && dashboardData.studyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboardData.studyData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="hours"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {dashboardData.studyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-chart">
                  <Book size={48} />
                  <h4>No study data yet</h4>
                  <p>Join some study rooms to see your subject distribution</p>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Progress Bar Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Weekly Study Progress</h3>
              <p>Hours per day</p>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.weeklyProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Bar dataKey="hours" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Subject Performance</h3>
              <p>Average scores</p>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="subject" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="var(--accent-green)" 
                    strokeWidth={3}
                    dot={{ fill: 'var(--accent-green)', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Recent Study Rooms */}
          <div className="dashboard-section">
            <div className="section-header">
              <div>
                <h2 className="flex items-center gap-2">
                  <BookOpen size={24} />
                  Active Study Rooms
                </h2>
                <p>Join your study groups</p>
              </div>
              <Link to="/study-rooms" className="btn btn-secondary">
                View All Rooms
              </Link>
            </div>
            <div className="rooms-list">
              {recentRooms.length > 0 ? (
                recentRooms.map(room => (
                  <div key={room._id} className="room-card modern">
                    <div className="room-header">
                      <h4>{room.name}</h4>
                      <span className="room-status active">Active</span>
                    </div>
                    <p>{room.description}</p>
                    <div className="room-meta">
                      <span className="course-tag">{room.course}</span>
                      <div className="room-stats">
                        <span className="member-count">
                          <Users size={16} />
                          {Array.isArray(room.members) ? room.members.length : 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <BookOpen size={48} />
                  <h3>No study rooms yet</h3>
                  <p>Join or create your first study room to get started!</p>
                  <Link to="/study-rooms" className="btn btn-primary">
                    Explore Study Rooms
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-section">
            <div className="section-header">
              <div>
                <h2 className="flex items-center gap-2">
                  <TrendingUp size={24} />
                  Quick Actions
                </h2>
                <p>Boost your productivity</p>
              </div>
            </div>
            <div className="actions-grid">
              <Link to="/study-rooms" className="action-card gradient-1">
                <div className="action-icon">
                  <Users size={28} />
                </div>
                <h3>Join Study Room</h3>
                <p>Collaborate with peers in real-time</p>
              </Link>
              <Link to="/resources" className="action-card gradient-2">
                <div className="action-icon">
                  <Book size={28} />
                </div>
                <h3>Browse Resources</h3>
                <p>Access study materials and notes</p>
              </Link>
              <Link to="/study-schedule" className="action-card gradient-3">
                <div className="action-icon">
                  <Clock size={28} />
                </div>
                <h3>Study Schedule</h3>
                <p>Plan your study sessions</p>
              </Link>
              <Link to="/activity-report" className="action-card gradient-4">
                <div className="action-icon">
                  <Award size={28} />
                </div>
                <h3>Activity Report</h3>
                <p>View personalized insights</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Recommendations Section */}
        <RecommendationsWidget />

        {/* University Profile Card */}
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div className="profile-info">
              <h3>{user?.name || 'Student'}</h3>
              <p>Academic Profile</p>
            </div>
          </div>
          <div className="profile-details">
            <div className="detail-item">
              <span className="detail-label">University</span>
              <span className="detail-value">{user?.university || 'Not specified'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Faculty</span>
              <span className="detail-value">{user?.faculty || 'Not specified'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Year</span>
              <span className="detail-value">{user?.year || 'Not specified'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">GPA</span>
              <span className="detail-value">{user?.gpa || 'Not available'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <ProfileEdit 
          user={user}
          onClose={() => setShowProfileEdit(false)}
          onUpdate={updateUser}
          onRefresh={fetchDashboardData}
        />
      )}

      {/* Subject Manager Modal */}
      {showSubjectManager && (
        <SubjectManager 
          onClose={() => setShowSubjectManager(false)}
          onRefresh={fetchDashboardData}
        />
      )}
    </div>
  );
};

export default Dashboard;