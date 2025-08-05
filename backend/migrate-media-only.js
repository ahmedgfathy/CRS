// Focused Media Migration Script - Links Appwrite storage to Supabase properties
require('dotenv').config();
const { Client, Databases, Query } = require('appwrite');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const config = {
    appwrite: {
        endpoint: 'https://cloud.appwrite.io/v1',
        projectId: '6732766d002b223d1598',
        databaseId: '677a9e5c0014e2994c62',
        propertiesCollectionId: '6737698b000cccaf6f16'
    },
    supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_SERVICE_ROLE_KEY
    }
};

class MediaMigrationService {
    constructor() {
        // Initialize Appwrite
        this.appwriteClient = new Client()
            .setEndpoint(config.appwrite.endpoint)
            .setProject(config.appwrite.projectId);
        this.databases = new Databases(this.appwriteClient);
        
        // Initialize Supabase
        this.supabase = createClient(config.supabase.url, config.supabase.key);
    }

    async migrateMedia() {
        console.log('🖼️ STARTING FOCUSED MEDIA MIGRATION');
        console.log('🔗 Linking Appwrite storage to Supabase properties by Property ID\n');

        try {
            // Step 1: Get all Supabase properties with Appwrite IDs
            const { data: supabaseProperties, error } = await this.supabase
                .from('properties')
                .select('id, appwrite_id, property_code, title')
                .not('appwrite_id', 'is', null);

            if (error) {
                throw new Error(`Failed to get Supabase properties: ${error.message}`);
            }

            console.log(`📊 Found ${supabaseProperties.length} properties in Supabase with Appwrite IDs`);

            // Step 2: Process each property
            let totalImages = 0;
            let totalVideos = 0;
            let propertiesWithMedia = 0;

            for (let i = 0; i < supabaseProperties.length; i++) {
                const property = supabaseProperties[i];
                
                try {
                    console.log(`\n🔄 Processing ${i + 1}/${supabaseProperties.length}: ${property.property_code}`);
                    console.log(`   Appwrite ID: ${property.appwrite_id}`);
                    console.log(`   Supabase ID: ${property.id}`);

                    // Get the full property from Appwrite using the Appwrite ID
                    const appwriteProperty = await this.getAppwriteProperty(property.appwrite_id);
                    
                    if (!appwriteProperty) {
                        console.log(`   ⚠️ Property not found in Appwrite`);
                        continue;
                    }

                    // Link images
                    const imageCount = await this.linkPropertyImages(appwriteProperty, property.id, property.property_code);
                    totalImages += imageCount;

                    // Link videos
                    const videoCount = await this.linkPropertyVideos(appwriteProperty, property.id, property.property_code);
                    totalVideos += videoCount;

                    if (imageCount > 0 || videoCount > 0) {
                        propertiesWithMedia++;
                        console.log(`   ✅ Linked ${imageCount} images, ${videoCount} videos`);
                    } else {
                        console.log(`   📝 No media found`);
                    }

                } catch (error) {
                    console.error(`   ❌ Error processing ${property.property_code}:`, error.message);
                }

                // Progress update every 10 properties
                if ((i + 1) % 10 === 0) {
                    console.log(`\n📊 PROGRESS UPDATE:`);
                    console.log(`   Processed: ${i + 1}/${supabaseProperties.length} properties`);
                    console.log(`   Images linked: ${totalImages}`);
                    console.log(`   Videos linked: ${totalVideos}`);
                    console.log(`   Properties with media: ${propertiesWithMedia}`);
                }
            }

            console.log(`\n🎉 MEDIA MIGRATION COMPLETED!`);
            console.log(`   📷 Total images linked: ${totalImages}`);
            console.log(`   🎥 Total videos linked: ${totalVideos}`);
            console.log(`   🏠 Properties with media: ${propertiesWithMedia}/${supabaseProperties.length}`);
            console.log(`   🔗 All media maintains connection to Appwrite storage`);

        } catch (error) {
            console.error('❌ Media migration failed:', error);
            throw error;
        }
    }

    async getAppwriteProperty(appwriteId) {
        try {
            const response = await this.databases.getDocument(
                config.appwrite.databaseId,
                config.appwrite.propertiesCollectionId,
                appwriteId
            );
            return response;
        } catch (error) {
            console.error(`Failed to get Appwrite property ${appwriteId}:`, error.message);
            return null;
        }
    }

    async linkPropertyImages(appwriteProperty, supabasePropertyId, propertyCode) {
        const images = this.parseJSON(appwriteProperty.propertyImage);
        if (!images || !Array.isArray(images) || images.length === 0) {
            return 0;
        }

        console.log(`   📷 Linking ${images.length} images...`);

        const imageRecords = images.map((image, index) => ({
            property_id: supabasePropertyId,
            image_url: image.fileUrl,
            image_title: `${propertyCode} - Image ${index + 1}`,
            alt_text: `Property image ${index + 1}`,
            sort_order: index,
            is_primary: index === 0,
            // Appwrite connection fields
            appwrite_property_id: appwriteProperty.$id,
            appwrite_file_id: image.id,
            appwrite_bucket_id: 'properties',
            storage_provider: 'appwrite',
            file_size: image.fileSize || null,
            file_type: image.mimeType || 'image/jpeg',
            original_filename: image.name || `image_${index + 1}`
        }));

        const { error } = await this.supabase
            .from('property_images')
            .upsert(imageRecords, {
                onConflict: 'property_id,sort_order',
                ignoreDuplicates: false
            });

        if (error) {
            console.error(`   ❌ Failed to link images:`, error.message);
            return 0;
        }

        return imageRecords.length;
    }

    async linkPropertyVideos(appwriteProperty, supabasePropertyId, propertyCode) {
        const videos = this.parseJSON(appwriteProperty.videos);
        if (!videos || !Array.isArray(videos) || videos.length === 0) {
            return 0;
        }

        console.log(`   🎥 Linking ${videos.length} videos...`);

        const videoRecords = videos.map((video, index) => ({
            property_id: supabasePropertyId,
            video_url: video.url,
            video_title: video.title || `${propertyCode} - Video ${index + 1}`,
            video_type: this.getVideoType(video.url),
            sort_order: index,
            // Appwrite connection fields
            appwrite_property_id: appwriteProperty.$id,
            appwrite_file_id: video.id || null,
            storage_provider: video.url.includes('appwrite') ? 'appwrite' : 'external',
            duration: video.duration || null,
            file_size: video.fileSize || null
        }));

        const { error } = await this.supabase
            .from('property_videos')
            .upsert(videoRecords, {
                onConflict: 'property_id,sort_order',
                ignoreDuplicates: false
            });

        if (error) {
            console.error(`   ❌ Failed to link videos:`, error.message);
            return 0;
        }

        return videoRecords.length;
    }

    parseJSON(value) {
        if (!value || value === '[]' || value === '{}') return null;
        try {
            return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
            return null;
        }
    }

    getVideoType(url) {
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('vimeo.com')) return 'vimeo';
        return 'direct';
    }
}

async function main() {
    const migrationService = new MediaMigrationService();
    
    try {
        await migrationService.migrateMedia();
    } catch (error) {
        console.error('💥 Media migration failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { MediaMigrationService };
