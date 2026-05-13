import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ErrorBoundary from './components/common/ErrorBoundary';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import StudyRooms from './components/dashboard/StudyRooms';
import StudyRoomDetail from './components/dashboard/StudyRoomDetail';
import Resources from './components/dashboard/Resources';
import StudySchedulePage from './components/dashboard/StudySchedulePage';
import ActivityReportPage from './components/dashboard/ActivityReportPage';
import NotificationSystem from './components/notifications/NotificationSystem';
import LoadingSpinner from './components/common/LoadingSpinner';
import PageTransition from './components/common/PageTransition';
import { AnimatePresence } from 'framer-motion';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    // Show loading spinner while checking authentication
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <LoadingSpinner />
        <p>Checking authentication...</p>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <SocketProvider>
          <Router>
            <AppContent />
          </Router>
        </SocketProvider>
      </ErrorBoundary>
    </AuthProvider>
  );
}

function AppContent() {
  const location = useLocation();
  
  return (
    <div className="App">
      <Navbar />
      <main className="main-content">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <PageTransition>
                      <Dashboard />
                    </PageTransition>
                  </ProtectedRoute>
                } />
                <Route path="/study-rooms" element={
                  <ProtectedRoute>
                    <PageTransition>
                      <StudyRooms />
                    </PageTransition>
                  </ProtectedRoute>
                } />
                <Route path="/room/:roomId" element={
                  <ProtectedRoute>
                    <PageTransition>
                      <StudyRoomDetail />
                    </PageTransition>
                  </ProtectedRoute>
                } />
                <Route path="/resources" element={
                  <ProtectedRoute>
                    <PageTransition>
                      <Resources />
                    </PageTransition>
                  </ProtectedRoute>
                } />
                <Route path="/study-schedule" element={
                  <ProtectedRoute>
                    <PageTransition>
                      <StudySchedulePage />
                    </PageTransition>
                  </ProtectedRoute>
                } />
                <Route path="/activity-report" element={
                  <ProtectedRoute>
                    <PageTransition>
                      <ActivityReportPage />
                    </PageTransition>
                  </ProtectedRoute>
                } />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
      <NotificationSystem />
    </div>
  );
}

export default App;