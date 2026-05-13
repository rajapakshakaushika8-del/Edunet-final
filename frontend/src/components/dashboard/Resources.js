import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Search, 
  Filter, 
  FileText, 
  Image, 
  Video, 
  File, 
  Eye,
  Share2,
  Heart,
  Calendar,
  User,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { resourceAPI, userAPI } from '../../services/api';
import './Resources.css';

const Resources = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    course: '',
    type: 'notes',
    tags: ''
  });
  const { user } = useAuth();

  const [userSubjects, setUserSubjects] = useState([]);
  const resourceTypes = ['All', 'notes', 'past-paper', 'presentation', 'video', 'other'];



  // Fetch resources and user subjects
  useEffect(() => {
    fetchResources();
    fetchUserSubjects();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const response = await resourceAPI.getAll();
      setResources(response.data.resources || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching resources:', error);
      setError('Failed to load resources. Please try again.');
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSubjects = async () => {
    try {
      const response = await userAPI.getUserSubjects();
      setUserSubjects(response.data || []);
    } catch (error) {
      console.error('Error fetching user subjects:', error);
      setUserSubjects([]);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadData.title || !uploadData.course || !uploadData.type) {
      setError('Please fill in all required fields and select a file.');
      return;
    }

    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadData.title);
      formData.append('description', uploadData.description);
      formData.append('course', uploadData.course);
      formData.append('type', uploadData.type);
      if (uploadData.tags) formData.append('tags', uploadData.tags);

      await resourceAPI.upload(formData);
      
      // Refresh resources list
      await fetchResources();
      
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadData({ title: '', description: '', course: '', type: 'notes', tags: '' });
      setError(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.response?.data?.message || 'Failed to upload file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Resource action handlers
  const handlePreview = (resource) => {
    if (resource.file && resource.file.url) {
      // Construction URL prefix if needed, but backend sends /uploads/... 
      // which needs full base URL
      window.open(`http://localhost:5000${resource.file.url}`, '_blank');
    } else {
      alert('Preview is only available for uploaded files.');
    }
  };

  const handleDownload = (resource) => {
    if (resource.file) {
      // Direct the browser to the backend download endpoint
      window.open(`http://localhost:5000/api/resources/${resource._id}/download`, '_blank');
    } else {
      alert('No file attached to this resource.');
    }
  };

  const handleShare = (resource) => {
    const shareUrl = `${window.location.origin}/resources?id=${resource._id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => alert('Resource link copied to clipboard!'))
        .catch(() => alert('Failed to copy link.'));
    } else {
      alert(`Share this link: ${shareUrl}`);
    }
  };

  // Get file type icon
  const getFileIcon = (type) => {
    switch (type) {
      case 'document':
      case 'presentation':
        return <FileText size={20} />;
      case 'image':
        return <Image size={20} />;
      case 'video':
        return <Video size={20} />;
      default:
        return <File size={20} />;
    }
  };

  // Filter resources
  const filteredResources = resources.filter(resource => {
    // Safety checks to prevent null reference errors
    if (!resource) return false;
    
    const title = resource.title || '';
    const description = resource.description || '';
    const tags = resource.tags || [];
    const type = resource.type || '';
    const course = resource.course || '';
    
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tags.some(tag => tag && tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'All' || type === filterType;
    const matchesSubject = filterSubject === 'All' || course === filterSubject;
    return matchesSearch && matchesType && matchesSubject;
  });

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Unknown Date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'Unknown Date';
    }
  };

  if (loading) {
    return (
      <div className="resources-loading">
        <LoadingSpinner />
        <p>Loading resources...</p>
      </div>
    );
  }

  return (
    <div className="resources-container">
      {/* Header */}
      <div className="resources-header">
        <div className="header-content">
          <div className="header-info">
            <h1>Educational Resources</h1>
            <p>Access and share study materials with the community</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="upload-btn"
          >
            <Upload size={20} />
            Upload Resource
          </button>
        </div>

        {/* Search and Filters */}
        <div className="resources-controls">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filters">
            <div className="filter-box">
              <Filter size={18} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                {resourceTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'All' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="filter-box">
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
              >
                <option value="All">All Subjects</option>
                {userSubjects.map(subject => (
                  <option key={subject._id} value={subject.name}>{subject.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="error-close">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Resources Grid */}
      <div className="resources-grid">
        {filteredResources.length === 0 ? (
          <div className="no-resources">
            <FileText size={48} />
            <h3>No Resources Found</h3>
            <p>
              {searchTerm || filterType !== 'All' || filterSubject !== 'All'
                ? 'Try adjusting your search or filter criteria.'
                : 'Be the first to upload a resource and help the community!'
              }
            </p>
            {!searchTerm && filterType === 'All' && filterSubject === 'All' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="upload-first-btn"
              >
                <Upload size={18} />
                Upload First Resource
              </button>
            )}
          </div>
        ) : (
          filteredResources.map(resource => {
            // Safety check to ensure resource exists and has required properties
            if (!resource || !resource._id) {
              return null;
            }

            return (
              <div key={resource._id} className="resource-card">
                <div className="resource-header">
                  <div className="resource-type">
                    {getFileIcon(resource.type || 'unknown')}
                    <span>{resource.type || 'Unknown Type'}</span>
                  </div>
                  <div className="resource-subject">
                    {resource.subject || 'No Subject'}
                  </div>
                </div>
                
                <div className="resource-content">
                  <h3>{resource.title || 'Untitled Resource'}</h3>
                  <p className="resource-description">{resource.description || 'No description available'}</p>
                  
                  <div className="resource-meta">
                    <div className="resource-file">
                      <File size={14} />
                      <span>{resource.file?.originalName || 'Unknown File'}</span>
                      <span className="file-size">({resource.file?.size ? formatFileSize(resource.file.size) : 'Unknown Size'})</span>
                    </div>
                    
                    <div className="resource-author">
                      <User size={14} />
                      <span>{resource.uploadedBy && resource.uploadedBy.name ? resource.uploadedBy.name : 'Anonymous'}</span>
                    </div>
                    
                    <div className="resource-date">
                      <Calendar size={14} />
                      <span>{resource.createdAt ? formatDate(resource.createdAt) : 'Unknown Date'}</span>
                    </div>
                  </div>
                  
                  {resource.tags && resource.tags.length > 0 && (
                    <div className="resource-tags">
                      {resource.tags.map((tag, index) => (
                        <span key={index} className="tag">
                          {tag || 'Tag'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="resource-stats">
                  <span className="stat">
                    <Download size={14} />
                    {resource.downloads || 0}
                  </span>
                  <span className="stat">
                    <Heart size={14} />
                    {resource.likes || 0}
                  </span>
                </div>
                
                <div className="resource-actions">
                  <button className="action-btn preview-btn" onClick={() => handlePreview(resource)}>
                    <Eye size={16} />
                    Preview
                  </button>
                  <button className="action-btn download-btn" onClick={() => handleDownload(resource)}>
                    <Download size={16} />
                    Download
                  </button>
                  <button className="action-btn share-btn" onClick={() => handleShare(resource)}>
                    <Share2 size={16} />
                    Share
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Upload Resource</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleFileUpload} className="upload-form">
              <div className="form-group">
                <label htmlFor="file">Select File</label>
                <div className="file-input-container">
                  <input
                    type="file"
                    id="file"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    required
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.mp4,.mov"
                  />
                  {uploadFile && (
                    <div className="file-info">
                      <File size={16} />
                      <span>{uploadFile.name}</span>
                      <span className="file-size">({formatFileSize(uploadFile.size)})</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  value={uploadData.title}
                  onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="Enter resource title..."
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  placeholder="Describe the resource..."
                  rows="3"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="subject">Subject</label>
                  <select
                    id="subject"
                    value={uploadData.course}
                    onChange={(e) => setUploadData(prev => ({ ...prev, course: e.target.value }))}
                    required
                  >
                    <option value="">Select subject</option>
                    {userSubjects.length > 0 ? (
                      userSubjects.map(subject => (
                        <option key={subject._id} value={subject.name}>{subject.name}</option>
                      ))
                    ) : (
                      <option value="" disabled>No subjects available - Add subjects from Dashboard</option>
                    )}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="type">Type</label>
                  <select
                    id="type"
                    value={uploadData.type}
                    onChange={(e) => setUploadData(prev => ({ ...prev, type: e.target.value }))}
                    required
                  >
                    {resourceTypes.slice(1).map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="tags">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="tags"
                  value={uploadData.tags}
                  onChange={(e) => setUploadData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g. calculus, mathematics, study guide"
                />
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  <Upload size={16} />
                  Upload Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;