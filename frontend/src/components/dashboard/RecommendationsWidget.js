import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userAPI } from '../../services/api';
import { Bookmark, Users, ChevronRight, BookOpen } from 'lucide-react';
import './RecommendationsWidget.css';

const RecommendationsWidget = () => {
  const [recommendations, setRecommendations] = useState({ rooms: [], resources: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await userAPI.getRecommendations();
      setRecommendations(response.data);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="recommendations-loading">Loading recommendations...</div>;

  const { rooms, resources } = recommendations;

  return (
    <div className="recommendations-widget">
      <div className="section-header">
        <h2>Recommended for You</h2>
        <p>Based on your subjects and activity</p>
      </div>

      <div className="rec-grid">
        <div className="rec-column">
          <h3><Users size={18} /> Study Rooms</h3>
          {rooms.length > 0 ? (
            <div className="rec-list">
              {rooms.map(room => (
                <Link to={`/room/${room._id}`} key={room._id} className="rec-item">
                  <div className="rec-item-info">
                    <h4>{room.name}</h4>
                    <span>{room.course}</span>
                  </div>
                  <ChevronRight size={16} className="arrow" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="no-rec-text">No room recommendations right now.</p>
          )}
        </div>

        <div className="rec-column">
          <h3><BookOpen size={18} /> Resources</h3>
          {resources.length > 0 ? (
            <div className="rec-list">
              {resources.map(res => (
                <div key={res._id} className="rec-item">
                  <div className="rec-item-info">
                    <h4>{res.title}</h4>
                    <span>{res.subject}</span>
                  </div>
                  <button className="btn-icon" onClick={() => alert('Download resource')} title="Download">
                    <Bookmark size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-rec-text">No resource recommendations right now.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecommendationsWidget;
