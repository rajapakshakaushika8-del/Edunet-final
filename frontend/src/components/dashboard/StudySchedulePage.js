import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import StudySchedule from './StudySchedule';
import './StudySchedulePage.css';

const StudySchedulePage = () => {
  const navigate = useNavigate();

  return (
    <div className="study-schedule-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>
        <h1>Study Schedule</h1>
      </div>
      <div className="page-content">
        <StudySchedule />
      </div>
    </div>
  );
};

export default StudySchedulePage;
