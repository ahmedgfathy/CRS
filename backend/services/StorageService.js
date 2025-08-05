// ═══════════════════════════════════════════════════════════════════════════════════
// SUPABASE FILE STORAGE SERVICE - NODE.JS
// ═══════════════════════════════════════════════════════════════════════════════════
// Complete file management service for Real Estate CRM
// Handles uploads, security, image processing, and CDN integration
// ═══════════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

/**
 * StorageService - Handles all file operations with security and optimization
 */
export class StorageService {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.tempDir = '/tmp/crm-uploads';
    this.maxFileSize = 50 * 1024 * 1024; // 50MB Supabase free plan limit
    this.maxVideoSize = 45 * 1024 * 1024; // 45MB for videos (with compression buffer)
    this.maxImageSize = 10 * 1024 * 1024; // 10MB for images
    
    // Ensure temp directory exists
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Get file categories and their restrictions
   */
  async getFileCategories() {
    const { data, error } = await this.supabase
      .from('file_categories')
      .select('*')
      .eq('status', 'active');
    
    if (error) throw error;
    return data;
  }

  /**
   * Validate file against category restrictions
   */
  async validateFile(file, categoryId) {
    const { data: category } = await this.supabase
      .from('file_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (!category) {
      throw new Error('Invalid file category');
    }

    // Check file size
    const maxSizeBytes = category.max_file_size_mb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new Error(`File size exceeds limit of ${category.max_file_size_mb}MB`);
    }

    // Check file type
    const fileExt = path.extname(file.originalname).toLowerCase().slice(1);
    if (!category.allowed_file_types.includes(fileExt)) {
      throw new Error(`File type .${fileExt} not allowed for this category`);
    }

    return category;
  }

  /**
   * Generate secure file path
   */
  generateFilePath(category, entityType, entityId, fileName, userId = null) {
    const date = new Date();
    const datePath = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    const randomString = crypto.randomBytes(8).toString('hex');
    const fileExt = path.extname(fileName);
    const baseName = path.basename(fileName, fileExt);
    
    let filePath = `${category.path_prefix}/${datePath}`;
    
    if (userId) {
      const userPrefix = userId.substring(0, 8);
      filePath += `/${userPrefix}`;
    }
    
    return `${filePath}/${entityId}_${randomString}${fileExt}`;
  }

  /**
   * Upload property image with optimization
   */
  async uploadPropertyImage(propertyId, file, options = {}) {
    try {
      const {
        isPrimary = false,
        title = '',
        description = '',
        altText = '',
        sortOrder = 0,
        userId
      } = options;

      // Validate file
      const category = await this.validateFile(file, 1); // property_images category
      
      // Generate file path
      const filePath = this.generateFilePath(category, 'properties', propertyId, file.originalname, userId);
      
      // Process image
      const processedImage = await this.processImage(file.buffer, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 85,
        generateThumbnail: true
      });

      // Upload original image
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(category.storage_bucket)
        .upload(filePath, processedImage.optimized, {
          contentType: file.mimetype,
          cacheControl: '31536000' // 1 year cache
        });

      if (uploadError) throw uploadError;

      // Upload thumbnail
      let thumbnailUrl = null;
      if (processedImage.thumbnail) {
        const thumbnailPath = filePath.replace(/(\.[^.]+)$/, '_thumb$1');
        const { data: thumbData, error: thumbError } = await this.supabase.storage
          .from(category.storage_bucket)
          .upload(thumbnailPath, processedImage.thumbnail, {
            contentType: file.mimetype,
            cacheControl: '31536000'
          });

        if (!thumbError) {
          const { data: { publicUrl: thumbPublicUrl } } = this.supabase.storage
            .from(category.storage_bucket)
            .getPublicUrl(thumbnailPath);
          thumbnailUrl = thumbPublicUrl;
        }
      }

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(category.storage_bucket)
        .getPublicUrl(filePath);

      // Save to database
      const { data: fileRecord, error: dbError } = await this.supabase
        .from('property_files')
        .insert({
          property_id: propertyId,
          category_id: category.id,
          file_name: path.basename(filePath),
          original_name: file.originalname,
          file_path: filePath,
          file_url: publicUrl,
          file_size: processedImage.optimized.length,
          file_type: path.extname(file.originalname).slice(1),
          mime_type: file.mimetype,
          width: processedImage.metadata.width,
          height: processedImage.metadata.height,
          thumbnail_url: thumbnailUrl,
          title: title,
          description: description,
          alt_text: altText || title,
          sort_order: sortOrder,
          is_primary: isPrimary,
          uploaded_by: userId,
          processing_status: 'completed'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return {
        success: true,
        file: fileRecord,
        url: publicUrl,
        thumbnailUrl: thumbnailUrl
      };

    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Upload property video with processing
   */
  async uploadPropertyVideo(propertyId, file, options = {}) {
    try {
      const {
        title = '',
        description = '',
        userId
      } = options;

      // Validate file
      const category = await this.validateFile(file, 2); // property_videos category
      
      // Generate file path
      const filePath = this.generateFilePath(category, 'properties', propertyId, file.originalname, userId);
      
      // Upload video
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(category.storage_bucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '31536000'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(category.storage_bucket)
        .getPublicUrl(filePath);

      // Generate video thumbnail
      const thumbnailUrl = await this.generateVideoThumbnail(publicUrl, filePath);

      // Get video metadata
      const videoMetadata = await this.getVideoMetadata(file.buffer);

      // Save to database
      const { data: fileRecord, error: dbError } = await this.supabase
        .from('property_files')
        .insert({
          property_id: propertyId,
          category_id: category.id,
          file_name: path.basename(filePath),
          original_name: file.originalname,
          file_path: filePath,
          file_url: publicUrl,
          file_size: file.size,
          file_type: path.extname(file.originalname).slice(1),
          mime_type: file.mimetype,
          duration_seconds: videoMetadata.duration,
          thumbnail_url: thumbnailUrl,
          title: title,
          description: description,
          uploaded_by: userId,
          processing_status: 'completed'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return {
        success: true,
        file: fileRecord,
        url: publicUrl,
        thumbnailUrl: thumbnailUrl
      };

    } catch (error) {
      console.error('Video upload error:', error);
      throw error;
    }
  }

  /**
   * Upload user avatar
   */
  async uploadUserAvatar(userId, file) {
    try {
      // Validate file
      const category = await this.validateFile(file, 5); // user_avatars category
      
      // Generate file path
      const filePath = this.generateFilePath(category, 'users', userId, file.originalname, userId);
      
      // Process avatar image
      const processedImage = await this.processImage(file.buffer, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 90,
        crop: 'square'
      });

      // Upload image
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(category.storage_bucket)
        .upload(filePath, processedImage.optimized, {
          contentType: file.mimetype,
          cacheControl: '31536000'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(category.storage_bucket)
        .getPublicUrl(filePath);

      // Save to database
      const { data: fileRecord, error: dbError } = await this.supabase
        .from('user_files')
        .insert({
          user_id: userId,
          category_id: category.id,
          file_name: path.basename(filePath),
          original_name: file.originalname,
          file_path: filePath,
          file_url: publicUrl,
          file_size: processedImage.optimized.length,
          file_type: path.extname(file.originalname).slice(1),
          mime_type: file.mimetype,
          title: 'Profile Picture',
          uploaded_by: userId,
          processing_status: 'completed'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Update user profile
      await this.supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      return {
        success: true,
        file: fileRecord,
        url: publicUrl
      };

    } catch (error) {
      console.error('Avatar upload error:', error);
      throw error;
    }
  }

  /**
   * Process image with aggressive optimization for free plan
   */
  async processImage(buffer, options = {}) {
    const {
      maxWidth = 1600, // Reduced from 1920 for free plan
      maxHeight = 1200, // Reduced from 1080 for free plan
      quality = 75,     // Reduced from 85 for better compression
      generateThumbnail = false,
      crop = null
    } = options;

    try {
      let image = sharp(buffer);
      
      // Get original metadata
      const metadata = await image.metadata();
      
      // Apply crop if specified
      if (crop === 'square') {
        const size = Math.min(metadata.width, metadata.height);
        image = image.resize(size, size, {
          fit: 'cover',
          position: 'center'
        });
      }
      
      // Resize if needed (more aggressive for free plan)
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        image = image.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      
      // Convert to JPEG and optimize aggressively
      const optimized = await image
        .jpeg({ 
          quality: quality, 
          progressive: true,
          mozjpeg: true // Better compression
        })
        .toBuffer();
      
      // Check if still too large after optimization
      if (optimized.length > this.maxImageSize) {
        // Try even more aggressive compression
        const recompressed = await sharp(buffer)
          .resize(1200, 900, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 65, progressive: true, mozjpeg: true })
          .toBuffer();
        
        if (recompressed.length > this.maxImageSize) {
          throw new Error(`Image too large even after compression. Maximum size: ${this.maxImageSize / 1024 / 1024}MB`);
        }
        
        return {
          optimized: recompressed,
          thumbnail: null,
          metadata: await sharp(recompressed).metadata()
        };
      }
      
      let thumbnail = null;
      if (generateThumbnail) {
        thumbnail = await sharp(buffer)
          .resize(250, 250, { // Reduced thumbnail size
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 70 })
          .toBuffer();
      }
      
      return {
        optimized,
        thumbnail,
        metadata: await sharp(optimized).metadata()
      };
      
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error('Failed to process image: ' + error.message);
    }
  }

  /**
   * Generate video thumbnail
   */
  async generateVideoThumbnail(videoUrl, filePath) {
    return new Promise((resolve, reject) => {
      const thumbnailPath = filePath.replace(/(\.[^.]+)$/, '_thumb.jpg');
      const tempOutputPath = path.join(this.tempDir, path.basename(thumbnailPath));
      
      ffmpeg(videoUrl)
        .screenshots({
          timestamps: ['10%'],
          filename: path.basename(thumbnailPath),
          folder: this.tempDir,
          size: '300x300'
        })
        .on('end', async () => {
          try {
            // Upload thumbnail to storage
            const thumbnailBuffer = await fs.readFile(tempOutputPath);
            
            const { data, error } = await this.supabase.storage
              .from('property-files')
              .upload(thumbnailPath, thumbnailBuffer, {
                contentType: 'image/jpeg',
                cacheControl: '31536000'
              });

            if (error) throw error;

            const { data: { publicUrl } } = this.supabase.storage
              .from('property-files')
              .getPublicUrl(thumbnailPath);

            // Clean up temp file
            await fs.unlink(tempOutputPath).catch(() => {});
            
            resolve(publicUrl);
          } catch (err) {
            reject(err);
          }
        })
        .on('error', reject);
    });
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(buffer) {
    return new Promise((resolve, reject) => {
      const tempFilePath = path.join(this.tempDir, `temp_${Date.now()}.mp4`);
      
      // Write buffer to temp file
      fs.writeFile(tempFilePath, buffer)
        .then(() => {
          ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
            // Clean up temp file
            fs.unlink(tempFilePath).catch(() => {});
            
            if (err) {
              reject(err);
              return;
            }
            
            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            
            resolve({
              duration: Math.round(metadata.format.duration || 0),
              width: videoStream?.width || 0,
              height: videoStream?.height || 0,
              bitrate: parseInt(metadata.format.bit_rate) || 0,
              size: parseInt(metadata.format.size) || 0
            });
          });
        })
        .catch(reject);
    });
  }

  /**
   * Delete file from storage and database
   */
  async deleteFile(fileId, fileType = 'property') {
    try {
      let table = '';
      switch (fileType) {
        case 'property':
          table = 'property_files';
          break;
        case 'user':
          table = 'user_files';
          break;
        case 'lead':
          table = 'lead_files';
          break;
        default:
          throw new Error('Invalid file type');
      }

      // Get file information
      const { data: fileInfo, error: fetchError } = await this.supabase
        .from(table)
        .select('file_path, thumbnail_url, category_id')
        .eq('id', fileId)
        .single();

      if (fetchError) throw fetchError;

      // Get category to determine bucket
      const { data: category } = await this.supabase
        .from('file_categories')
        .select('storage_bucket')
        .eq('id', fileInfo.category_id)
        .single();

      // Delete from storage
      const filesToDelete = [fileInfo.file_path];
      if (fileInfo.thumbnail_url) {
        const thumbnailPath = fileInfo.file_path.replace(/(\.[^.]+)$/, '_thumb$1');
        filesToDelete.push(thumbnailPath);
      }

      const { error: storageError } = await this.supabase.storage
        .from(category.storage_bucket)
        .remove(filesToDelete);

      if (storageError) console.warn('Storage deletion warning:', storageError);

      // Delete from database
      const { error: dbError } = await this.supabase
        .from(table)
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      return { success: true };

    } catch (error) {
      console.error('Delete file error:', error);
      throw error;
    }
  }

  /**
   * Get property files
   */
  async getPropertyFiles(propertyId, categoryId = null) {
    let query = this.supabase
      .from('property_files_with_categories')
      .select('*')
      .eq('property_id', propertyId)
      .eq('processing_status', 'completed');

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query.order('is_primary', { ascending: false })
                                      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(fileId, fileType, updates) {
    try {
      let table = '';
      switch (fileType) {
        case 'property':
          table = 'property_files';
          break;
        case 'user':
          table = 'user_files';
          break;
        case 'lead':
          table = 'lead_files';
          break;
        default:
          throw new Error('Invalid file type');
      }

      const { data, error } = await this.supabase
        .from(table)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', fileId)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Update file metadata error:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(userId = null) {
    const { data, error } = await this.supabase
      .rpc('get_storage_usage', { user_id: userId });

    if (error) throw error;
    return data;
  }
}

/**
 * Multer configuration for file uploads
 */
export const createUploadMiddleware = (fieldName = 'file', options = {}) => {
  const {
    maxFiles = 10,
    maxFileSize = 50 * 1024 * 1024, // 50MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf']
  } = options;

  const storage = multer.memoryStorage();
  
  const fileFilter = (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxFileSize,
      files: maxFiles
    }
  }).fields([
    { name: fieldName, maxCount: maxFiles }
  ]);
};

export default StorageService;
