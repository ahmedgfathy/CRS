# 📁 Supabase File Storage Integration Guide

## 🎯 Overview
This guide shows you how to implement secure file storage for your Real Estate CRM using Supabase Storage instead of local folders. This solution provides better security, scalability, and CDN integration.

## ✅ **Why Supabase Storage Over Local Folders?**

### **Security Benefits:**
- ✅ **Row Level Security (RLS)**: Files respect your database permissions
- ✅ **User-based Access Control**: Only authorized users can access files
- ✅ **Secure URLs**: Temporary signed URLs for private files
- ✅ **No Server Vulnerabilities**: No local file system exposure

### **Performance Benefits:**
- ✅ **Global CDN**: Automatic worldwide distribution
- ✅ **Image Optimization**: Automatic resizing and compression
- ✅ **Caching**: Built-in browser and CDN caching
- ✅ **Bandwidth Optimization**: Efficient file delivery

### **Scalability Benefits:**
- ✅ **Unlimited Storage**: No server disk space limits
- ✅ **Auto-scaling**: Handles any number of files
- ✅ **Future CDN Migration**: Easy to switch CDN providers later

## 🚀 **Implementation Steps**

### **Step 1: Database Setup**
Run the storage integration SQL to add file management tables:

```bash
# Apply the storage database schema
psql -h db.cqylpwdcwrssttrtvtov.supabase.co -U postgres -d postgres -f supabase_storage_integration.sql
```

### **Step 2: Create Storage Buckets**
Create the required storage buckets in your Supabase dashboard:

```sql
-- Execute in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public) VALUES 
('property-files', 'property-files', true),
('user-files', 'user-files', false),
('lead-files', 'lead-files', false),
('marketing-files', 'marketing-files', true);
```

### **Step 3: Set Storage Policies**
Configure bucket-level security policies:

```sql
-- Property files policy (public read, authenticated write)
CREATE POLICY "Property files are publicly readable" ON storage.objects
FOR SELECT USING (bucket_id = 'property-files');

CREATE POLICY "Authenticated users can upload property files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'property-files' AND auth.role() = 'authenticated');

-- User files policy (private)
CREATE POLICY "Users can manage own files" ON storage.objects
FOR ALL USING (
  bucket_id = 'user-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Lead files policy (agent access only)
CREATE POLICY "Lead files access control" ON storage.objects
FOR SELECT USING (
  bucket_id = 'lead-files' 
  AND (
    -- File owner can access
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Managers can access all
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  )
);
```

### **Step 4: Install Node.js Dependencies**
```bash
npm install @supabase/supabase-js multer sharp fluent-ffmpeg
```

### **Step 5: Environment Configuration**
Add to your `.env` file:

```bash
# Storage Configuration
SUPABASE_URL="https://cqylpwdcwrssttrtvtov.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
SUPABASE_ANON_KEY="your_anon_key"

# File Upload Limits
MAX_FILE_SIZE=52428800  # 50MB
MAX_FILES_PER_UPLOAD=20
ALLOWED_IMAGE_TYPES="jpg,jpeg,png,webp"
ALLOWED_VIDEO_TYPES="mp4,mov,avi"
ALLOWED_DOC_TYPES="pdf,doc,docx"

# Image Processing
IMAGE_QUALITY=85
THUMBNAIL_SIZE=300
AUTO_GENERATE_THUMBNAILS=true
ENABLE_IMAGE_OPTIMIZATION=true
```

## 📱 **Frontend Integration Examples**

### **React Component for Property Image Upload**
```jsx
import React, { useState } from 'react';

const PropertyImageUpload = ({ propertyId, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);

  const handleFileSelect = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const uploadImages = async () => {
    setUploading(true);
    
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('images', file);
      formData.append(`titles[${index}]`, `Property Image ${index + 1}`);
    });
    formData.append('setPrimaryFirst', 'true');

    try {
      const response = await fetch(`/api/files/properties/${propertyId}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        onUploadComplete(result.results);
        setFiles([]);
      } else {
        console.error('Upload failed:', result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-upload">
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      
      {files.length > 0 && (
        <div className="file-preview">
          <p>{files.length} files selected</p>
          <button onClick={uploadImages} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Images'}
          </button>
        </div>
      )}
    </div>
  );
};
```

### **Property Gallery Component**
```jsx
const PropertyGallery = ({ propertyId }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPropertyImages();
  }, [propertyId]);

  const loadPropertyImages = async () => {
    try {
      const response = await fetch(`/api/files/properties/${propertyId}?category=1`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const result = await response.json();
      setImages(result.files || []);
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading gallery...</div>;

  return (
    <div className="property-gallery">
      {images.map((image) => (
        <div key={image.id} className="gallery-item">
          <img
            src={image.thumbnail_url || image.file_url}
            alt={image.alt_text || image.title}
            onClick={() => openLightbox(image.file_url)}
          />
          {image.is_primary && <span className="primary-badge">Primary</span>}
        </div>
      ))}
    </div>
  );
};
```

## 🔧 **API Usage Examples**

### **Upload Property Images**
```bash
curl -X POST "https://your-api.com/api/files/properties/123/images" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "titles[0]=Main View" \
  -F "titles[1]=Kitchen" \
  -F "setPrimaryFirst=true"
```

### **Upload Property Video**
```bash
curl -X POST "https://your-api.com/api/files/properties/123/videos" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@property_tour.mp4" \
  -F "title=Property Virtual Tour" \
  -F "description=Complete walkthrough of the property"
```

### **Get Property Files**
```bash
curl -X GET "https://your-api.com/api/files/properties/123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Update File Metadata**
```bash
curl -X PATCH "https://your-api.com/api/files/properties/456" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Image Title",
    "description": "New description",
    "is_primary": true,
    "alt_text": "Beautiful property exterior"
  }'
```

## 🔒 **Security Features**

### **File Access Control**
- **Public Files**: Property images/videos (for listings)
- **Private Files**: User documents, lead attachments
- **Role-based Access**: Agents see assigned properties only
- **Owner Access**: Property owners manage their files

### **Upload Validation**
- **File Type Validation**: Only allowed extensions
- **Size Limits**: Configurable per category
- **Virus Scanning**: Can be added via Supabase Edge Functions
- **Content Validation**: Image/video format verification

### **Data Protection**
- **Encrypted Storage**: All files encrypted at rest
- **Secure URLs**: Temporary signed URLs for private access
- **Audit Trail**: All file operations logged
- **GDPR Compliance**: Easy file deletion and data export

## 📊 **Performance Optimization**

### **Image Optimization**
- **Automatic Compression**: JPEG quality optimization
- **Thumbnail Generation**: 300px thumbnails for galleries
- **WebP Conversion**: Modern format support
- **Responsive Images**: Multiple sizes for different devices

### **Video Processing**
- **Thumbnail Extraction**: Automatic video thumbnails
- **Metadata Extraction**: Duration, dimensions, bitrate
- **Format Validation**: Supported video formats only
- **Streaming Support**: Progressive download

### **CDN Integration**
- **Global Distribution**: Supabase global CDN
- **Browser Caching**: Long-term cache headers
- **Compression**: Gzip/Brotli compression
- **Future Migration**: Easy CDN provider switching

## 🚀 **Production Deployment**

### **Monitoring Setup**
```javascript
// Add to your monitoring dashboard
const storageMetrics = {
  totalFiles: 'SELECT COUNT(*) FROM property_files',
  totalStorage: 'SELECT SUM(file_size) FROM property_files',
  dailyUploads: 'SELECT COUNT(*) FROM property_files WHERE created_at >= CURRENT_DATE',
  failedUploads: 'SELECT COUNT(*) FROM property_files WHERE processing_status = \'failed\''
};
```

### **Backup Strategy**
- **Database Backups**: Supabase automatic backups
- **File Backups**: Supabase handles file redundancy
- **Disaster Recovery**: Multi-region storage
- **Point-in-time Recovery**: Database + file consistency

### **Scaling Considerations**
- **Storage Quotas**: Monitor usage and set alerts
- **Bandwidth Limits**: Optimize file sizes
- **Concurrent Uploads**: Rate limiting and queuing
- **Geographic Distribution**: Edge locations for global users

## 📈 **Analytics & Insights**

### **Usage Tracking**
```sql
-- Most viewed properties by image views
SELECT p.title, COUNT(pf.id) as image_count, SUM(p.views_count) as total_views
FROM properties p
LEFT JOIN property_files pf ON p.id = pf.property_id
GROUP BY p.id, p.title
ORDER BY total_views DESC;

-- Storage usage by agent
SELECT up.full_name, COUNT(pf.id) as files_uploaded, 
       ROUND(SUM(pf.file_size)/1024/1024, 2) as storage_mb
FROM user_profiles up
LEFT JOIN property_files pf ON up.id = pf.uploaded_by
GROUP BY up.id, up.full_name
ORDER BY storage_mb DESC;
```

## 🛠️ **Maintenance & Troubleshooting**

### **Common Issues**
1. **Large File Uploads**: Check network timeout settings
2. **Image Quality**: Adjust compression settings
3. **Storage Limits**: Monitor and alert on quotas
4. **Permission Errors**: Verify RLS policies

### **Optimization Tasks**
- **Weekly**: Review storage usage and clean unused files
- **Monthly**: Optimize image compression settings
- **Quarterly**: Review and update file categories
- **Yearly**: Evaluate CDN performance and costs

---

## 🎯 **Migration from Local Storage**

If you had local files before:

```javascript
// Migration script example
const migrateLocalFiles = async () => {
  const localFiles = await getLocalFiles();
  
  for (const file of localFiles) {
    try {
      const buffer = await fs.readFile(file.path);
      await storageService.uploadPropertyImage(file.propertyId, {
        buffer: buffer,
        originalname: file.name,
        mimetype: file.mimeType
      });
      
      console.log(`Migrated: ${file.name}`);
    } catch (error) {
      console.error(`Failed to migrate ${file.name}:`, error);
    }
  }
};
```

This storage solution is **production-ready**, **secure**, and **scalable**. It integrates perfectly with your existing database and user management system while providing enterprise-level file handling capabilities.
