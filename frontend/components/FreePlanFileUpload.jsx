// ═══════════════════════════════════════════════════════════════════════════════════
// FREE PLAN FILE UPLOAD COMPONENT - REACT
// ═══════════════════════════════════════════════════════════════════════════════════
// Handles file uploads with Supabase free plan limitations (50MB max)
// Includes compression, validation, and user-friendly error messages
// ═══════════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { FREE_PLAN_CONFIG, FreePlanHelper } from './freePlanConfig.js';

const FreePlanFileUpload = ({ 
  propertyId, 
  category = 'image', 
  onUploadComplete, 
  onError,
  multiple = false,
  maxFiles = 10 
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);

  // File validation with free plan limits
  const validateFile = useCallback((file) => {
    const fileSize = file.size;
    const fileType = file.type;
    const fileName = file.name;
    
    // Check file type
    let allowedTypes = [];
    switch (category) {
      case 'image':
        allowedTypes = FREE_PLAN_CONFIG.ALLOWED_TYPES.IMAGES;
        break;
      case 'video':
        allowedTypes = FREE_PLAN_CONFIG.ALLOWED_TYPES.VIDEOS;
        break;
      case 'document':
        allowedTypes = FREE_PLAN_CONFIG.ALLOWED_TYPES.DOCUMENTS;
        break;
      default:
        allowedTypes = [...FREE_PLAN_CONFIG.ALLOWED_TYPES.IMAGES, ...FREE_PLAN_CONFIG.ALLOWED_TYPES.VIDEOS];
    }
    
    const fileExt = fileName.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      return {
        valid: false,
        error: `File type .${fileExt} not allowed. Allowed: ${allowedTypes.join(', ')}`
      };
    }

    // Check file size with suggestions
    const sizeCheck = FreePlanHelper.getOptimizationSuggestion(fileSize, fileType, category);
    
    return {
      valid: sizeCheck.canUpload,
      error: sizeCheck.canUpload ? null : sizeCheck.message,
      suggestions: sizeCheck.suggestions,
      needsCompression: fileSize > FREE_PLAN_CONFIG.LIMITS.MAX_IMAGE_SIZE && category === 'image'
    };
  }, [category]);

  // Handle file selection
  const handleFileSelect = useCallback((event) => {
    const selectedFiles = Array.from(event.target.files);
    const validFiles = [];
    const newErrors = [];
    const newWarnings = [];

    selectedFiles.forEach((file, index) => {
      const validation = validateFile(file);
      
      if (validation.valid) {
        validFiles.push({
          file,
          id: `${Date.now()}_${index}`,
          name: file.name,
          size: file.size,
          type: file.type,
          needsCompression: validation.needsCompression
        });
        
        if (validation.needsCompression) {
          newWarnings.push(`${file.name} will be compressed to fit size limits`);
        }
      } else {
        newErrors.push({
          file: file.name,
          error: validation.error,
          suggestions: validation.suggestions
        });
      }
    });

    setFiles(validFiles);
    setErrors(newErrors);
    setWarnings(newWarnings);
  }, [validateFile]);

  // Compress image if needed
  const compressImage = async (file) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        const maxWidth = FREE_PLAN_CONFIG.IMAGE.MAX_WIDTH;
        const maxHeight = FREE_PLAN_CONFIG.IMAGE.MAX_HEIGHT;
        
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/jpeg',
          FREE_PLAN_CONFIG.IMAGE.QUALITY / 100
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Upload files
  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress({});

    const results = [];

    for (const [index, fileObj] of files.entries()) {
      try {
        setUploadProgress(prev => ({
          ...prev,
          [fileObj.id]: { status: 'processing', progress: 0 }
        }));

        let uploadFile = fileObj.file;

        // Compress image if needed
        if (fileObj.needsCompression && fileObj.type.startsWith('image/')) {
          setUploadProgress(prev => ({
            ...prev,
            [fileObj.id]: { status: 'compressing', progress: 25 }
          }));
          
          uploadFile = await compressImage(fileObj.file);
        }

        // Prepare form data
        const formData = new FormData();
        
        if (category === 'image') {
          formData.append('images', uploadFile);
          formData.append(`titles[${index}]`, `Property Image ${index + 1}`);
          if (index === 0) formData.append('setPrimaryFirst', 'true');
        } else if (category === 'video') {
          formData.append('video', uploadFile);
          formData.append('title', `Property Video`);
        }

        setUploadProgress(prev => ({
          ...prev,
          [fileObj.id]: { status: 'uploading', progress: 50 }
        }));

        // Upload to server
        const endpoint = category === 'image' 
          ? `/api/files/properties/${propertyId}/images`
          : `/api/files/properties/${propertyId}/videos`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          setUploadProgress(prev => ({
            ...prev,
            [fileObj.id]: { status: 'completed', progress: 100 }
          }));
          results.push({ ...result, fileName: fileObj.name });
        } else {
          throw new Error(result.error || 'Upload failed');
        }

      } catch (error) {
        console.error(`Upload failed for ${fileObj.name}:`, error);
        setUploadProgress(prev => ({
          ...prev,
          [fileObj.id]: { status: 'error', progress: 0, error: error.message }
        }));
        results.push({ success: false, fileName: fileObj.name, error: error.message });
      }
    }

    setUploading(false);
    
    if (onUploadComplete) {
      onUploadComplete(results);
    }

    // Clear files after upload
    setFiles([]);
    setErrors([]);
    setWarnings([]);
  };

  // Remove file from list
  const removeFile = (fileId) => {
    setFiles(files.filter(f => f.id !== fileId));
  };

  return (
    <div className="free-plan-upload">
      {/* File Selection */}
      <div className="upload-section">
        <input
          type="file"
          multiple={multiple && category === 'image'}
          accept={category === 'image' ? 'image/*' : category === 'video' ? 'video/*' : '*'}
          onChange={handleFileSelect}
          disabled={uploading}
          className="file-input"
        />
        
        {/* Free Plan Info */}
        <div className="plan-info">
          <p className="text-sm text-gray-600">
            📦 <strong>Free Plan:</strong> Max {category === 'video' ? '45MB' : '10MB'} per file
          </p>
          {category === 'video' && (
            <p className="text-xs text-blue-600">
              💡 Tip: Compress videos to H.264, 720p, 1Mbps for best results
            </p>
          )}
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="errors-section">
          <h4 className="text-red-600 font-medium">❌ Upload Errors:</h4>
          {errors.map((error, index) => (
            <div key={index} className="error-item">
              <p className="text-red-600">{error.file}: {error.error}</p>
              {error.suggestions && (
                <ul className="suggestions">
                  {error.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-blue-600 text-sm">💡 {suggestion}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="warnings-section">
          <h4 className="text-yellow-600 font-medium">⚠️ Compression Notice:</h4>
          {warnings.map((warning, index) => (
            <p key={index} className="text-yellow-600 text-sm">{warning}</p>
          ))}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="files-section">
          <h4 className="font-medium">📁 Files Ready to Upload:</h4>
          {files.map((fileObj) => (
            <div key={fileObj.id} className="file-item">
              <div className="file-info">
                <span className="file-name">{fileObj.name}</span>
                <span className="file-size">({FreePlanHelper.formatFileSize(fileObj.size)})</span>
                {fileObj.needsCompression && (
                  <span className="compression-badge">🗜️ Will compress</span>
                )}
              </div>
              
              {uploadProgress[fileObj.id] && (
                <div className="progress-info">
                  <span className="status">{uploadProgress[fileObj.id].status}</span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${uploadProgress[fileObj.id].progress}%` }}
                    />
                  </div>
                  {uploadProgress[fileObj.id].error && (
                    <span className="error-text">{uploadProgress[fileObj.id].error}</span>
                  )}
                </div>
              )}
              
              {!uploading && (
                <button 
                  onClick={() => removeFile(fileObj.id)}
                  className="remove-btn"
                >
                  ❌
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <div className="upload-actions">
          <button
            onClick={uploadFiles}
            disabled={uploading}
            className="upload-btn"
          >
            {uploading ? '⏳ Uploading...' : `📤 Upload ${files.length} file(s)`}
          </button>
        </div>
      )}

      {/* Alternative Solutions for Large Files */}
      {errors.some(e => e.suggestions?.length > 0) && (
        <div className="alternatives-section">
          <h4 className="font-medium">🔄 Alternative Solutions:</h4>
          <div className="external-options">
            {category === 'video' && (
              <div className="option">
                <h5>📹 For Large Videos:</h5>
                <ul>
                  <li>Upload to <a href="https://youtube.com" target="_blank" rel="noopener">YouTube</a> and paste the link</li>
                  <li>Use <a href="https://vimeo.com" target="_blank" rel="noopener">Vimeo</a> for professional hosting</li>
                  <li>Try video compression tools like HandBrake</li>
                </ul>
              </div>
            )}
            <div className="option">
              <h5>📊 Upgrade Option:</h5>
              <p>Supabase Pro plan offers 500GB file size limit and image transformations</p>
            </div>
          </div>
        </div>
      )}

      {/* CSS Styles */}
      <style jsx>{`
        .free-plan-upload {
          border: 2px dashed #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          margin: 10px 0;
        }
        
        .plan-info {
          background: #f0f7ff;
          padding: 10px;
          border-radius: 6px;
          margin: 10px 0;
        }
        
        .errors-section, .warnings-section {
          background: #fff5f5;
          padding: 10px;
          border-radius: 6px;
          margin: 10px 0;
        }
        
        .warnings-section {
          background: #fffbeb;
        }
        
        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          margin: 5px 0;
        }
        
        .progress-bar {
          width: 100px;
          height: 6px;
          background: #e0e0e0;
          border-radius: 3px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: #4CAF50;
          transition: width 0.3s;
        }
        
        .upload-btn {
          background: #007bff;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        
        .upload-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .alternatives-section {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin-top: 15px;
        }
        
        .alternatives-section a {
          color: #007bff;
          text-decoration: none;
        }
        
        .alternatives-section a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default FreePlanFileUpload;
