import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>EduNet Sri Lanka</h3>
            <p>Building bridges between isolated learners across Sri Lankan universities.</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="/study-rooms">Study Rooms</a></li>
              <li><a href="/resources">Resources</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Contact</h4>
            <p>Email: [EMAIL_ADDRESS]</p>
            <p>Phone: [PHONE_NUMBER]</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 EduNet Sri Lanka. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;