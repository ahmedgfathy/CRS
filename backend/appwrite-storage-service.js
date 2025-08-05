// appwrite-storage-service.js - Service for accessing Appwrite storage from Supabase app
require('dotenv').config();
const { Client, Storage } = require('appwrite');

class AppwriteStorageService {
    constructor() {
        this.client = new Client()
            .setEndpoint('https://cloud.appwrite.io/v1')
            .setProject('6732766d002b223d1598'); // Your Appwrite project ID
        
        this.storage = new Storage(this.client);
    }

    /**
     * Get file preview URL from Appwrite storage
     */
    getFilePreview(bucketId, fileId, width = 800, height = 600) {
        try {
            return this.storage.getFilePreview(bucketId, fileId, width, height);
        } catch (error) {
            console.error(`Error getting file preview for ${fileId}:`, error);
            return null;
        }
    }

    /**
     * Get file download URL from Appwrite storage
     */
    getFileDownload(bucketId, fileId) {
        try {
            return this.storage.getFileDownload(bucketId, fileId);
        } catch (error) {
            console.error(`Error getting file download for ${fileId}:`, error);
            return null;
        }
    }

    /**
     * Get file view URL from Appwrite storage
     */
    getFileView(bucketId, fileId) {
        try {
            return this.storage.getFileView(bucketId, fileId);
        } catch (error) {
            console.error(`Error getting file view for ${fileId}:`, error);
            return null;
        }
    }

    /**
     * Get file metadata from Appwrite storage
     */
    async getFileMetadata(bucketId, fileId) {
        try {
            const file = await this.storage.getFile(bucketId, fileId);
            return {
                id: file.$id,
                name: file.name,
                size: file.sizeOriginal,
                mimeType: file.mimeType,
                bucket: file.bucketId,
                created: file.$createdAt,
                updated: file.$updatedAt
            };
        } catch (error) {
            console.error(`Error getting file metadata for ${fileId}:`, error);
            return null;
        }
    }

    /**
     * Generate responsive image URLs for different screen sizes
     */
    getResponsiveImageUrls(bucketId, fileId) {
        const sizes = {
            thumbnail: { width: 150, height: 150 },
            small: { width: 400, height: 300 },
            medium: { width: 800, height: 600 },
            large: { width: 1200, height: 900 },
            original: null // Original size
        };

        const urls = {};
        
        for (const [sizeName, dimensions] of Object.entries(sizes)) {
            if (dimensions) {
                urls[sizeName] = this.getFilePreview(bucketId, fileId, dimensions.width, dimensions.height);
            } else {
                urls[sizeName] = this.getFileView(bucketId, fileId);
            }
        }

        return urls;
    }

    /**
     * Check if file exists in Appwrite storage
     */
    async fileExists(bucketId, fileId) {
        try {
            await this.storage.getFile(bucketId, fileId);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get all files from a bucket (for admin purposes)
     */
    async listFiles(bucketId, queries = []) {
        try {
            const response = await this.storage.listFiles(bucketId, queries);
            return response.files;
        } catch (error) {
            console.error(`Error listing files in bucket ${bucketId}:`, error);
            return [];
        }
    }
}

// Helper function to process property images from Supabase with Appwrite storage
async function processPropertyImages(images, appwriteStorage) {
    if (!images || !Array.isArray(images)) return [];

    const processedImages = [];

    for (const image of images) {
        if (image.storage_provider === 'appwrite' && image.appwrite_file_id) {
            const bucketId = image.appwrite_bucket_id || 'properties';
            
            // Generate responsive URLs
            const responsiveUrls = appwriteStorage.getResponsiveImageUrls(bucketId, image.appwrite_file_id);
            
            // Get metadata if needed
            const metadata = await appwriteStorage.getFileMetadata(bucketId, image.appwrite_file_id);

            processedImages.push({
                ...image,
                urls: responsiveUrls,
                metadata: metadata,
                isAccessible: await appwriteStorage.fileExists(bucketId, image.appwrite_file_id)
            });
        } else {
            // For non-Appwrite images, use the original URL
            processedImages.push({
                ...image,
                urls: {
                    original: image.image_url,
                    thumbnail: image.image_url,
                    small: image.image_url,
                    medium: image.image_url,
                    large: image.image_url
                },
                isAccessible: true
            });
        }
    }

    return processedImages;
}

// Helper function to process property videos from Supabase with Appwrite storage
async function processPropertyVideos(videos, appwriteStorage) {
    if (!videos || !Array.isArray(videos)) return [];

    const processedVideos = [];

    for (const video of videos) {
        if (video.storage_provider === 'appwrite' && video.appwrite_file_id) {
            const bucketId = 'properties'; // Assuming videos are in properties bucket
            
            // Get video file URL and metadata
            const videoUrl = appwriteStorage.getFileView(bucketId, video.appwrite_file_id);
            const metadata = await appwriteStorage.getFileMetadata(bucketId, video.appwrite_file_id);

            processedVideos.push({
                ...video,
                processed_url: videoUrl,
                metadata: metadata,
                isAccessible: await appwriteStorage.fileExists(bucketId, video.appwrite_file_id)
            });
        } else {
            // For external videos (YouTube, Vimeo, etc.), use original URL
            processedVideos.push({
                ...video,
                processed_url: video.video_url,
                isAccessible: true
            });
        }
    }

    return processedVideos;
}

module.exports = {
    AppwriteStorageService,
    processPropertyImages,
    processPropertyVideos
};

/* 
USAGE EXAMPLE:

const { AppwriteStorageService, processPropertyImages } = require('./appwrite-storage-service');
const { createClient } = require('@supabase/supabase-js');

// Initialize services
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const appwriteStorage = new AppwriteStorageService();

// Get property with images from Supabase
const { data: property } = await supabase
    .from('property_media_view')
    .select('*')
    .eq('property_code', 'PROP123')
    .single();

// Process images to get Appwrite URLs
const processedImages = await processPropertyImages(property.images, appwriteStorage);

// Use processed images in your frontend
processedImages.forEach(image => {
    console.log('Thumbnail URL:', image.urls.thumbnail);
    console.log('Full size URL:', image.urls.large);
    console.log('File accessible:', image.isAccessible);
});
*/
