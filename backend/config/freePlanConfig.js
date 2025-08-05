// ═══════════════════════════════════════════════════════════════════════════════════
// SUPABASE FREE PLAN CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════
// Optimized settings for Supabase free plan limitations
// File size limit: 50MB per file
// ═══════════════════════════════════════════════════════════════════════════════════

export const FREE_PLAN_CONFIG = {
  // File size limits (in bytes)
  LIMITS: {
    MAX_FILE_SIZE: 50 * 1024 * 1024,        // 50MB - Supabase limit
    MAX_VIDEO_SIZE: 45 * 1024 * 1024,       // 45MB - buffer for metadata
    MAX_IMAGE_SIZE: 10 * 1024 * 1024,       // 10MB - good quality images
    MAX_DOCUMENT_SIZE: 25 * 1024 * 1024,    // 25MB - documents/PDFs
    MAX_AVATAR_SIZE: 3 * 1024 * 1024,       // 3MB - profile pictures
    
    // Per-user quotas
    USER_STORAGE_QUOTA: 500 * 1024 * 1024,  // 500MB per user
    WARN_AT_PERCENTAGE: 80,                  // Warn at 80% usage
  },

  // Image optimization settings
  IMAGE: {
    MAX_WIDTH: 1600,           // Reduced for file size
    MAX_HEIGHT: 1200,          // Reduced for file size
    QUALITY: 75,               // Good quality, smaller size
    THUMBNAIL_SIZE: 250,       // Smaller thumbnails
    THUMBNAIL_QUALITY: 70,     // Compressed thumbnails
    PROGRESSIVE: true,         // Better loading
    MOZJPEG: true,            // Better compression
  },

  // Video optimization settings
  VIDEO: {
    MAX_DURATION: 300,         // 5 minutes max
    RECOMMENDED_BITRATE: 1000, // 1Mbps for good quality/size balance
    THUMBNAIL_TIME: '10%',     // Thumbnail at 10% of video
    THUMBNAIL_SIZE: '320x240', // Small video thumbnails
  },

  // Allowed file types (optimized for web)
  ALLOWED_TYPES: {
    IMAGES: ['jpg', 'jpeg', 'png', 'webp'],
    VIDEOS: ['mp4', 'mov'],    // Removed AVI (larger files)
    DOCUMENTS: ['pdf', 'doc', 'docx'],
    AVATARS: ['jpg', 'jpeg', 'png', 'webp'],
  },

  // Storage buckets configuration
  BUCKETS: {
    'property-files': {
      public: true,
      maxFileSize: 45 * 1024 * 1024,
      allowedTypes: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'pdf']
    },
    'user-files': {
      public: false,
      maxFileSize: 3 * 1024 * 1024,
      allowedTypes: ['jpg', 'jpeg', 'png', 'webp']
    },
    'lead-files': {
      public: false,
      maxFileSize: 25 * 1024 * 1024,
      allowedTypes: ['pdf', 'doc', 'docx', 'jpg', 'png']
    },
    'marketing-files': {
      public: true,
      maxFileSize: 25 * 1024 * 1024,
      allowedTypes: ['jpg', 'png', 'pdf', 'mp4']
    }
  },

  // Upload strategies for large files
  COMPRESSION_STRATEGIES: {
    IMAGES: [
      { quality: 75, maxWidth: 1600, maxHeight: 1200 },
      { quality: 65, maxWidth: 1400, maxHeight: 1000 },
      { quality: 55, maxWidth: 1200, maxHeight: 900 },
    ],
    VIDEOS: [
      { bitrate: '1000k', scale: 'scale=1280:720' },
      { bitrate: '800k', scale: 'scale=1024:576' },
      { bitrate: '600k', scale: 'scale=854:480' },
    ]
  },

  // Error messages
  MESSAGES: {
    FILE_TOO_LARGE: 'File exceeds the 50MB limit of Supabase free plan',
    VIDEO_TOO_LARGE: 'Video files must be under 45MB. Consider compressing your video.',
    IMAGE_TOO_LARGE: 'Image files should be under 10MB for optimal performance',
    QUOTA_EXCEEDED: 'Storage quota exceeded. You have used {used}MB of {total}MB',
    UPGRADE_SUGGESTION: 'Consider upgrading to Supabase Pro for larger file limits (500GB)',
  },

  // Tips for users
  OPTIMIZATION_TIPS: [
    'Compress videos before uploading (recommended: H.264, 1Mbps bitrate)',
    'Use JPEG format for photos instead of PNG when possible',
    'Resize images to 1600x1200 or smaller before uploading',
    'Use online tools like TinyPNG or Squoosh for image compression',
    'For videos over 45MB, use external hosting (YouTube, Vimeo) and store links',
  ],

  // External alternatives for large files
  EXTERNAL_HOSTING: {
    VIDEOS: [
      { name: 'YouTube', description: 'Free, unlimited video hosting', url: 'https://youtube.com' },
      { name: 'Vimeo', description: 'Professional video hosting', url: 'https://vimeo.com' },
      { name: 'Cloudinary', description: 'Media management with free tier', url: 'https://cloudinary.com' },
    ],
    DOCUMENTS: [
      { name: 'Google Drive', description: 'Free cloud storage with sharing', url: 'https://drive.google.com' },
      { name: 'Dropbox', description: 'File sharing and storage', url: 'https://dropbox.com' },
    ]
  }
};

// Helper functions for free plan optimization
export class FreePlanHelper {
  
  /**
   * Check if file can be uploaded under free plan
   */
  static canUpload(fileSize, fileType, category) {
    const limits = FREE_PLAN_CONFIG.LIMITS;
    
    switch (category) {
      case 'video':
        return fileSize <= limits.MAX_VIDEO_SIZE;
      case 'image':
        return fileSize <= limits.MAX_IMAGE_SIZE;
      case 'document':
        return fileSize <= limits.MAX_DOCUMENT_SIZE;
      case 'avatar':
        return fileSize <= limits.MAX_AVATAR_SIZE;
      default:
        return fileSize <= limits.MAX_FILE_SIZE;
    }
  }

  /**
   * Get optimization suggestion for oversized files
   */
  static getOptimizationSuggestion(fileSize, fileType, category) {
    const limits = FREE_PLAN_CONFIG.LIMITS;
    const messages = FREE_PLAN_CONFIG.MESSAGES;
    
    if (category === 'video' && fileSize > limits.MAX_VIDEO_SIZE) {
      return {
        canUpload: false,
        message: messages.VIDEO_TOO_LARGE,
        suggestions: [
          'Compress video using HandBrake or similar tool',
          'Target 1Mbps bitrate and 720p resolution',
          'Use H.264 codec for better compression',
          'Consider hosting on YouTube/Vimeo and storing the link'
        ]
      };
    }
    
    if (category === 'image' && fileSize > limits.MAX_IMAGE_SIZE) {
      return {
        canUpload: false,
        message: messages.IMAGE_TOO_LARGE,
        suggestions: [
          'Resize image to 1600x1200 or smaller',
          'Use JPEG format with 75% quality',
          'Try online compression tools like TinyPNG',
          'Remove unnecessary metadata from the image'
        ]
      };
    }
    
    return {
      canUpload: true,
      message: 'File size is acceptable',
      suggestions: []
    };
  }

  /**
   * Calculate user storage usage percentage
   */
  static calculateStorageUsage(usedBytes) {
    const quota = FREE_PLAN_CONFIG.LIMITS.USER_STORAGE_QUOTA;
    const percentage = (usedBytes / quota) * 100;
    
    return {
      usedMB: Math.round(usedBytes / 1024 / 1024),
      totalMB: Math.round(quota / 1024 / 1024),
      percentage: Math.round(percentage),
      nearLimit: percentage >= FREE_PLAN_CONFIG.LIMITS.WARN_AT_PERCENTAGE,
      exceeded: percentage >= 100
    };
  }

  /**
   * Get compression settings based on file size
   */
  static getCompressionSettings(fileSize, fileType) {
    const strategies = FREE_PLAN_CONFIG.COMPRESSION_STRATEGIES;
    
    if (fileType.startsWith('image/')) {
      // Try different compression levels
      for (const strategy of strategies.IMAGES) {
        const estimatedSize = fileSize * (strategy.quality / 100);
        if (estimatedSize <= FREE_PLAN_CONFIG.LIMITS.MAX_IMAGE_SIZE) {
          return strategy;
        }
      }
      return strategies.IMAGES[strategies.IMAGES.length - 1]; // Most aggressive
    }
    
    if (fileType.startsWith('video/')) {
      // Try different video compression levels
      for (const strategy of strategies.VIDEOS) {
        return strategy; // Return first suitable strategy
      }
    }
    
    return null;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get external hosting recommendations
   */
  static getExternalHostingOptions(fileType) {
    if (fileType.startsWith('video/')) {
      return FREE_PLAN_CONFIG.EXTERNAL_HOSTING.VIDEOS;
    }
    
    if (fileType === 'application/pdf' || fileType.includes('document')) {
      return FREE_PLAN_CONFIG.EXTERNAL_HOSTING.DOCUMENTS;
    }
    
    return [];
  }
}

export default FREE_PLAN_CONFIG;
