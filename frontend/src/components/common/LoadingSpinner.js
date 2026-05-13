import React from 'react';
import { Loader2 } from 'lucide-react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 24, text = "Loading..." }) => {
  return (
    <div className="loading-spinner">
      <Loader2 size={size} className="spinner-icon" />
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;