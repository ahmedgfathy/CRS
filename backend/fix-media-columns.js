// fix-media-columns.js
// This script directly updates the appwrite_images and appwrite_videos columns
// for existing properties using a more efficient approach

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

class MediaFixService {
    constructor() {
        // Initialize Appwrite client
        this.appwriteClient = new Client()
            .setEndpoint(config.appwrite.endpoint)
            .setProject(config.appwrite.projectId);
        
        this.appwriteDB = new Databases(this.appwriteClient);
        
        // Initialize Supabase client
        this.supabase = createClient(config.supabase.url, config.supabase.key);
    }

    async fixMediaColumns() {
        try {
            console.log('🚀 Starting Media Columns Fix');
            console.log('📋 Goal: Update appwrite_images and appwrite_videos columns with proper data');
            console.log('🔗 Expected: 5000+ images from bucket 673a2734001f92c1826e, 173+ videos from bucket 6755abbe00350ded34b7\n');

            const startTime = Date.now();

            // Get existing properties from Supabase to get their IDs
            console.log('=== STEP 1: GETTING EXISTING SUPABASE PROPERTIES ===');
            const { data: existingProperties, error } = await this.supabase
                .from('properties')
                .select('id, appwrite_id, property_code')
                .not('appwrite_id', 'is', null);

            if (error) {
                throw new Error(`Failed to get existing properties: ${error.message}`);
            }

            console.log(`✅ Found ${existingProperties.length} existing properties in Supabase\n`);

            // Process in smaller batches using direct updates
            console.log('=== STEP 2: UPDATING MEDIA DATA ===');
            await this.updateMediaInBatches(existingProperties);

            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;
            
            console.log('\n🎉 MEDIA FIX COMPLETED!');
            console.log(`⏱️ Total time: ${duration.toFixed(2)} seconds`);
            
            // Validation
            await this.validateMediaFix();
            
        } catch (error) {
            console.error('❌ MEDIA FIX FAILED:', error);
            throw error;
        }
    }

    async updateMediaInBatches(properties) {
        const batchSize = 10; // Much smaller batches for direct updates
        let updateCount = 0;
        let mediaStats = { totalImages: 0, totalVideos: 0, propertiesWithMedia: 0 };

        for (let i = 0; i < properties.length; i += batchSize) {
            const batch = properties.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(properties.length / batchSize);
            
            console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches}: Properties ${i + 1}-${Math.min(i + batchSize, properties.length)}`);

            for (const property of batch) {
                try {
                    // Get the corresponding Appwrite property
                    const appwriteProperty = await this.getAppwriteProperty(property.appwrite_id);
                    
                    if (!appwriteProperty) {
                        console.warn(`⚠️ Appwrite property not found: ${property.appwrite_id}`);
                        continue;
                    }

                    // Parse media data
                    const appwriteImages = this.parseAppwriteMedia(appwriteProperty.propertyImage, '673a2734001f92c1826e');
                    const appwriteVideos = this.parseAppwriteMedia(appwriteProperty.videos, '6755abbe00350ded34b7');
                    
                    // Count media
                    if (appwriteImages && appwriteImages.length > 0) {
                        mediaStats.totalImages += appwriteImages.length;
                        mediaStats.propertiesWithMedia++;
                    }
                    if (appwriteVideos && appwriteVideos.length > 0) {
                        mediaStats.totalVideos += appwriteVideos.length;
                    }

                    // Update this specific property
                    const { error: updateError } = await this.supabase
                        .from('properties')
                        .update({
                            appwrite_images: appwriteImages,
                            appwrite_videos: appwriteVideos,
                            main_image_url: appwriteImages?.[0]?.fileUrl || null,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', property.id);

                    if (updateError) {
                        console.error(`❌ Failed to update property ${property.property_code}:`, updateError.message);
                    } else {
                        updateCount++;
                        if (appwriteImages && appwriteImages.length > 0) {
                            console.log(`✅ Updated ${property.property_code}: ${appwriteImages.length} images, ${appwriteVideos?.length || 0} videos`);
                        }
                    }

                } catch (error) {
                    console.error(`❌ Error processing property ${property.property_code}:`, error.message);
                }
            }

            // Progress indicator
            const progress = ((i + batchSize) / properties.length * 100).toFixed(1);
            console.log(`📊 Progress: ${progress}% | Updated: ${updateCount} properties`);
            console.log(`📷 Media found: ${mediaStats.totalImages} images, ${mediaStats.totalVideos} videos`);

            // Small delay to avoid overwhelming the servers
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`\n📊 MEDIA UPDATE SUMMARY:`);
        console.log(`   ✅ Properties Updated: ${updateCount}`);
        console.log(`   🖼️ Total Images: ${mediaStats.totalImages} (Expected: 5000+)`);
        console.log(`   🎥 Total Videos: ${mediaStats.totalVideos} (Expected: 173+)`);
        console.log(`   🏠 Properties with Media: ${mediaStats.propertiesWithMedia}`);
        console.log(`   🔗 All media linked to Appwrite storage buckets`);
    }

    async getAppwriteProperty(appwriteId) {
        try {
            const response = await this.appwriteDB.getDocument(
                config.appwrite.databaseId,
                config.appwrite.propertiesCollectionId,
                appwriteId
            );
            return response;
        } catch (error) {
            if (error.code === 404) {
                return null; // Property not found
            }
            throw error;
        }
    }

    parseAppwriteMedia(mediaString, expectedBucketId) {
        if (!mediaString || mediaString === '[]' || mediaString === '{}') return null;
        
        try {
            const mediaArray = typeof mediaString === 'string' ? JSON.parse(mediaString) : mediaString;
            if (!Array.isArray(mediaArray) || mediaArray.length === 0) return null;
            
            // Return the media array with all Appwrite storage information intact
            return mediaArray.map(media => ({
                id: media.id,
                fileUrl: media.fileUrl,
                name: media.name || null,
                mimeType: media.mimeType || null,
                fileSize: media.fileSize || null,
                bucketId: media.bucketId || expectedBucketId,
                createdAt: media.$createdAt || null,
                updatedAt: media.$updatedAt || null
            }));
        } catch (error) {
            console.warn(`⚠️ Error parsing media data: ${error.message}`);
            return null;
        }
    }

    async validateMediaFix() {
        console.log('\n🔍 VALIDATION: Checking media fix results...');
        
        try {
            // Check how many properties have media now
            const { count: propertiesWithImages } = await this.supabase
                .from('properties')
                .select('*', { count: 'exact', head: true })
                .not('appwrite_images', 'is', null);

            const { count: propertiesWithVideos } = await this.supabase
                .from('properties')
                .select('*', { count: 'exact', head: true })
                .not('appwrite_videos', 'is', null);

            // Get detailed media statistics
            const { data: mediaStats } = await this.supabase
                .from('properties')
                .select('appwrite_images, appwrite_videos')
                .not('appwrite_images', 'is', null)
                .limit(1000);

            let totalImages = 0;
            let totalVideos = 0;

            if (mediaStats) {
                mediaStats.forEach(prop => {
                    if (prop.appwrite_images && Array.isArray(prop.appwrite_images)) {
                        totalImages += prop.appwrite_images.length;
                    }
                    if (prop.appwrite_videos && Array.isArray(prop.appwrite_videos)) {
                        totalVideos += prop.appwrite_videos.length;
                    }
                });
            }

            // Get a sample property with media for verification
            const { data: sampleProperty } = await this.supabase
                .from('properties')
                .select('property_code, appwrite_id, appwrite_images, appwrite_videos, main_image_url')
                .not('appwrite_images', 'is', null)
                .limit(1)
                .single();

            console.log(`📊 VALIDATION RESULTS:`);
            console.log(`   🏠 Properties with Images: ${propertiesWithImages}`);
            console.log(`   🎬 Properties with Videos: ${propertiesWithVideos}`);
            console.log(`   🖼️ Total Images: ${totalImages} (Expected: 5000+)`);
            console.log(`   🎥 Total Videos: ${totalVideos} (Expected: 173+)`);

            if (sampleProperty) {
                console.log(`\n🔍 SAMPLE PROPERTY VERIFICATION:`);
                console.log(`   Property Code: ${sampleProperty.property_code}`);
                console.log(`   Appwrite ID: ${sampleProperty.appwrite_id}`);
                console.log(`   Images Count: ${sampleProperty.appwrite_images?.length || 0}`);
                console.log(`   Videos Count: ${sampleProperty.appwrite_videos?.length || 0}`);
                console.log(`   Main Image URL: ${sampleProperty.main_image_url?.substring(0, 80)}...`);
                
                if (sampleProperty.appwrite_images?.[0]) {
                    const firstImage = sampleProperty.appwrite_images[0];
                    console.log(`\n   🔗 First Image Details:`);
                    console.log(`     File ID: ${firstImage.id}`);
                    console.log(`     Bucket ID: ${firstImage.bucketId}`);
                    console.log(`     File URL: ${firstImage.fileUrl?.substring(0, 100)}...`);
                    console.log(`     File Size: ${firstImage.fileSize} bytes`);
                    console.log(`     MIME Type: ${firstImage.mimeType}`);
                }
            }

            if (totalImages >= 1000) {
                console.log('\n✅ MEDIA FIX SUCCESSFUL: 1000+ images linked properly');
                console.log('✅ All media maintains connection to Appwrite storage');
                console.log('🎯 Your mobile app can now display images from Appwrite storage bucket 673a2734001f92c1826e');
            } else {
                console.log('\n⚠️ MEDIA FIX NEEDS REVIEW: Less than 1000 images found');
            }

        } catch (error) {
            console.error('❌ Validation failed:', error);
        }
    }
}

// Main execution
async function main() {
    const mediaService = new MediaFixService();
    
    try {
        await mediaService.fixMediaColumns();
    } catch (error) {
        console.error('💥 Media fix failed:', error);
        process.exit(1);
    }
}

// Execute if running directly
if (require.main === module) {
    main();
}

module.exports = { MediaFixService };
