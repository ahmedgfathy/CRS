// ═══════════════════════════════════════════════════════════════════════════════════
// FILE MANAGEMENT API ROUTES - NODE.JS EXPRESS
// ═══════════════════════════════════════════════════════════════════════════════════
// RESTful API endpoints for file upload, management, and retrieval
// Integrates with Supabase authentication and RLS policies
// ═══════════════════════════════════════════════════════════════════════════════════

import express from 'express';
import { StorageService, createUploadMiddleware } from './StorageService.js';
import { authMiddleware, checkPermission } from './authMiddleware.js';

const router = express.Router();

// Initialize storage service
const storageService = new StorageService(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ═══════════════════════════════════════════════════════════════════════════════════
// PROPERTY FILE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Upload property images
 * POST /api/files/properties/:propertyId/images
 */
router.post('/properties/:propertyId/images',
  authMiddleware,
  checkPermission('properties.update'),
  createUploadMiddleware('images', {
    maxFiles: 20,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  }),
  async (req, res) => {
    try {
      const { propertyId } = req.params;
      const files = req.files.images || [];
      const userId = req.user.id;

      if (!files.length) {
        return res.status(400).json({
          success: false,
          error: 'No images provided'
        });
      }

      // Process each image
      const results = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isPrimary = i === 0 && req.body.setPrimaryFirst === 'true';
        
        try {
          const result = await storageService.uploadPropertyImage(propertyId, file, {
            isPrimary,
            title: req.body.titles?.[i] || '',
            description: req.body.descriptions?.[i] || '',
            altText: req.body.altTexts?.[i] || '',
            sortOrder: i,
            userId
          });
          
          results.push(result);
        } catch (error) {
          console.error(`Failed to upload image ${i}:`, error);
          results.push({
            success: false,
            error: error.message,
            fileName: file.originalname
          });
        }
      }

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.json({
        success: true,
        uploaded: successful.length,
        failed: failed.length,
        results: results
      });

    } catch (error) {
      console.error('Property images upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload images'
      });
    }
  }
);

/**
 * Upload property video
 * POST /api/files/properties/:propertyId/videos
 */
router.post('/properties/:propertyId/videos',
  authMiddleware,
  checkPermission('properties.update'),
  createUploadMiddleware('video', {
    maxFiles: 1,
    maxFileSize: 45 * 1024 * 1024, // 45MB (under Supabase free plan limit)
    allowedTypes: ['video/mp4', 'video/mov', 'video/avi']
  }),
  async (req, res) => {
    try {
      const { propertyId } = req.params;
      const file = req.files.video?.[0];
      const userId = req.user.id;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No video file provided'
        });
      }

      const result = await storageService.uploadPropertyVideo(propertyId, file, {
        title: req.body.title || '',
        description: req.body.description || '',
        userId
      });

      res.json(result);

    } catch (error) {
      console.error('Property video upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Get property files
 * GET /api/files/properties/:propertyId
 */
router.get('/properties/:propertyId',
  authMiddleware,
  checkPermission('properties.read'),
  async (req, res) => {
    try {
      const { propertyId } = req.params;
      const { category } = req.query;

      const files = await storageService.getPropertyFiles(
        propertyId, 
        category ? parseInt(category) : null
      );

      res.json({
        success: true,
        files: files
      });

    } catch (error) {
      console.error('Get property files error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve files'
      });
    }
  }
);

/**
 * Update property file metadata
 * PATCH /api/files/properties/:fileId
 */
router.patch('/properties/:fileId',
  authMiddleware,
  checkPermission('properties.update'),
  async (req, res) => {
    try {
      const { fileId } = req.params;
      const updates = req.body;

      // Filter allowed update fields
      const allowedFields = [
        'title', 'description', 'alt_text', 'caption', 
        'sort_order', 'is_primary', 'is_public', 'tags'
      ];
      
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});

      const result = await storageService.updateFileMetadata(
        fileId, 
        'property', 
        filteredUpdates
      );

      res.json({
        success: true,
        file: result
      });

    } catch (error) {
      console.error('Update property file error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Delete property file
 * DELETE /api/files/properties/:fileId
 */
router.delete('/properties/:fileId',
  authMiddleware,
  checkPermission('properties.update'),
  async (req, res) => {
    try {
      const { fileId } = req.params;

      const result = await storageService.deleteFile(fileId, 'property');

      res.json(result);

    } catch (error) {
      console.error('Delete property file error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════════
// USER FILE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Upload user avatar
 * POST /api/files/users/avatar
 */
router.post('/users/avatar',
  authMiddleware,
  createUploadMiddleware('avatar', {
    maxFiles: 1,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  }),
  async (req, res) => {
    try {
      const file = req.files.avatar?.[0];
      const userId = req.user.id;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No avatar file provided'
        });
      }

      const result = await storageService.uploadUserAvatar(userId, file);

      res.json(result);

    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Upload lead attachment
 * POST /api/files/leads/:leadId/attachments
 */
router.post('/leads/:leadId/attachments',
  authMiddleware,
  checkPermission('leads.update'),
  createUploadMiddleware('attachments', {
    maxFiles: 5,
    maxFileSize: 25 * 1024 * 1024, // 25MB for documents
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword']
  }),
  async (req, res) => {
    try {
      const { leadId } = req.params;
      const files = req.files.attachments || [];
      const userId = req.user.id;

      if (!files.length) {
        return res.status(400).json({
          success: false,
          error: 'No attachments provided'
        });
      }

      // Process each attachment
      const results = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const result = await storageService.uploadLeadAttachment(leadId, file, {
            title: req.body.titles?.[i] || file.originalname,
            description: req.body.descriptions?.[i] || '',
            isConfidential: req.body.isConfidential !== 'false',
            userId
          });
          
          results.push(result);
        } catch (error) {
          console.error(`Failed to upload attachment ${i}:`, error);
          results.push({
            success: false,
            error: error.message,
            fileName: file.originalname
          });
        }
      }

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.json({
        success: true,
        uploaded: successful.length,
        failed: failed.length,
        results: results
      });

    } catch (error) {
      console.error('Lead attachments upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload attachments'
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════════
// ADMIN & UTILITY ROUTES
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Get file categories
 * GET /api/files/categories
 */
router.get('/categories',
  authMiddleware,
  async (req, res) => {
    try {
      const categories = await storageService.getFileCategories();

      res.json({
        success: true,
        categories: categories
      });

    } catch (error) {
      console.error('Get file categories error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve file categories'
      });
    }
  }
);

/**
 * Get storage statistics
 * GET /api/files/stats
 */
router.get('/stats',
  authMiddleware,
  async (req, res) => {
    try {
      const { user_id } = req.query;
      const userId = user_id || (req.user.role === 'admin' ? null : req.user.id);

      const stats = await storageService.getStorageStats(userId);

      res.json({
        success: true,
        stats: stats
      });

    } catch (error) {
      console.error('Get storage stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve storage statistics'
      });
    }
  }
);

/**
 * Bulk file operations
 * POST /api/files/bulk
 */
router.post('/bulk',
  authMiddleware,
  checkPermission('properties.update'),
  async (req, res) => {
    try {
      const { action, fileIds, fileType = 'property' } = req.body;

      if (!action || !fileIds || !Array.isArray(fileIds)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid bulk operation parameters'
        });
      }

      const results = [];

      switch (action) {
        case 'delete':
          for (const fileId of fileIds) {
            try {
              const result = await storageService.deleteFile(fileId, fileType);
              results.push({ fileId, success: true });
            } catch (error) {
              results.push({ fileId, success: false, error: error.message });
            }
          }
          break;

        case 'update':
          const { updates } = req.body;
          for (const fileId of fileIds) {
            try {
              const result = await storageService.updateFileMetadata(fileId, fileType, updates);
              results.push({ fileId, success: true, data: result });
            } catch (error) {
              results.push({ fileId, success: false, error: error.message });
            }
          }
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Unsupported bulk action'
          });
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        success: true,
        processed: results.length,
        successful: successful,
        failed: failed,
        results: results
      });

    } catch (error) {
      console.error('Bulk file operation error:', error);
      res.status(500).json({
        success: false,
        error: 'Bulk operation failed'
      });
    }
  }
);

/**
 * Search files
 * GET /api/files/search
 */
router.get('/search',
  authMiddleware,
  async (req, res) => {
    try {
      const { 
        q: query, 
        type: fileType = 'property',
        category,
        limit = 50,
        offset = 0 
      } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Search query required'
        });
      }

      // Determine table based on file type
      let table = '';
      switch (fileType) {
        case 'property':
          table = 'property_files_with_categories';
          break;
        case 'user':
          table = 'user_files';
          break;
        case 'lead':
          table = 'lead_files';
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid file type'
          });
      }

      // Build search query
      let searchQuery = storageService.supabase
        .from(table)
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,original_name.ilike.%${query}%`)
        .eq('processing_status', 'completed')
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (category) {
        searchQuery = searchQuery.eq('category_id', category);
      }

      const { data, error } = await searchQuery;

      if (error) throw error;

      res.json({
        success: true,
        files: data,
        query: query,
        count: data.length
      });

    } catch (error) {
      console.error('File search error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed'
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════════

router.use((error, req, res, next) => {
  console.error('File management error:', error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        success: false,
        error: 'Too many files'
      });
    }
  }

  res.status(500).json({
    success: false,
    error: 'File operation failed'
  });
});

export default router;
