import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Download, FileText, Activity, Clock, Award, Star } from 'lucide-react';
import './ActivityReportPage.css';

const ActivityReportPage = () => {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const response = await userAPI.getActivityReport();
      setReport(response.data);
    } catch (error) {
      console.error('Failed to fetch activity report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  if (loading) return <LoadingSpinner />;
  
  if (!report) return (
    <div className="empty-state">
      <FileText size={48} />
      <h3>No Activity Report Available</h3>
    </div>
  );

  return (
    <div className="activity-report-page">
      <div className="report-header">
        <div>
          <h1>Personalized Activity Report</h1>
          <p>Detailed performance and study habits analysis for {user?.name}</p>
        </div>
        <button className="btn btn-primary" onClick={handleDownloadPDF}>
          <Download size={18} /> Download PDF
        </button>
      </div>

      <div className="report-summary-cards">
        <div className="summary-card">
          <Clock size={24} className="icon" />
          <div className="content">
            <h4>Total Hours</h4>
            <p>{report.totalHours}</p>
          </div>
        </div>
        <div className="summary-card">
          <Activity size={24} className="icon" />
          <div className="content">
            <h4>Rooms Joined</h4>
            <p>{report.totalRooms}</p>
          </div>
        </div>
        <div className="summary-card">
          <FileText size={24} className="icon" />
          <div className="content">
            <h4>Resources Shared</h4>
            <p>{report.totalResources}</p>
          </div>
        </div>
      </div>

      <div className="report-grid">
        <div className="chart-section">
          <h3>Monthly Activity Breakdown</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report.monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="insights-section">
          <div className="insight-card positive">
            <h3><Award size={20} /> Key Strengths</h3>
            <ul>
              {report.strengths.map((str, idx) => (
                <li key={idx}>{str}</li>
              ))}
            </ul>
          </div>
          <div className="insight-card areas">
            <h3><Star size={20} /> Areas for Improvement</h3>
            <ul>
              {report.areasForImprovement.map((area, idx) => (
                <li key={idx}>{area}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityReportPage;
