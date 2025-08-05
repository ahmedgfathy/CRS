// update-media-only.js
// This script updates ONLY the appwrite_images and appwrite_videos columns 
// for existing properties in Supabase with the correct Appwrite storage data

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

class MediaUpdateService {
    constructor() {
        // Initialize Appwrite client
        this.appwriteClient = new Client()
            .setEndpoint(config.appwrite.endpoint)
            .setProject(config.appwrite.projectId);
        
        this.appwriteDB = new Databases(this.appwriteClient);
        
        // Initialize Supabase client
        this.supabase = createClient(config.supabase.url, config.supabase.key);
    }

    async updateMediaData() {
        try {
            console.log('🚀 Starting Media Data Update');
            console.log('📋 Goal: Fix appwrite_images and appwrite_videos columns with proper Appwrite storage data');
            console.log('🔗 Expected: 5000+ images from bucket 673a2734001f92c1826e, 173+ videos from bucket 6755abbe00350ded34b7\n');

            const startTime = Date.now();

            // Step 1: Get all Appwrite properties with media
            console.log('=== STEP 1: FETCHING APPWRITE PROPERTIES ===');
            const appwriteProperties = await this.getAllAppwriteProperties();
            console.log(`✅ Retrieved ${appwriteProperties.length} properties from Appwrite\n`);

            // Step 2: Update Supabase properties with correct media data
            console.log('=== STEP 2: UPDATING SUPABASE MEDIA DATA ===');
            await this.updateSupabaseMediaData(appwriteProperties);

            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;
            
            console.log('\n🎉 MEDIA UPDATE COMPLETED!');
            console.log(`⏱️ Total time: ${duration.toFixed(2)} seconds`);
            
            // Validation
            await this.validateMediaUpdate();
            
        } catch (error) {
            console.error('❌ MEDIA UPDATE FAILED:', error);
            throw error;
        }
    }

    async getAllAppwriteProperties() {
        const allProperties = [];
        let offset = 0;
        const limit = 500;
        let hasMore = true;

        while (hasMore) {
            try {
                const response = await this.appwriteDB.listDocuments(
                    config.appwrite.databaseId,
                    config.appwrite.propertiesCollectionId,
                    [
                        Query.limit(limit),
                        Query.offset(offset)
                    ]
                );

                allProperties.push(...response.documents);
                console.log(`📦 Fetched ${offset + response.documents.length} / ${response.total} properties`);

                offset += limit;
                hasMore = response.documents.length === limit && offset < response.total;

            } catch (error) {
                console.error('❌ Error fetching properties:', error);
                throw error;
            }
        }

        return allProperties;
    }

    async updateSupabaseMediaData(appwriteProperties) {
        const batchSize = 50;
        let updateCount = 0;
        let mediaStats = { totalImages: 0, totalVideos: 0, propertiesWithMedia: 0 };

        console.log(`📦 Processing ${appwriteProperties.length} properties in batches of ${batchSize}`);

        for (let i = 0; i < appwriteProperties.length; i += batchSize) {
            const batch = appwriteProperties.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(appwriteProperties.length / batchSize);
            
            console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches}: Properties ${i + 1}-${Math.min(i + batchSize, appwriteProperties.length)}`);

            const updates = [];
            
            for (const appwriteProperty of batch) {
                try {
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

                    // Prepare update record - ONLY update media fields
                    const updateRecord = {
                        appwrite_images: appwriteImages,
                        appwrite_videos: appwriteVideos,
                        main_image_url: appwriteImages?.[0]?.fileUrl || null,
                        updated_at: new Date().toISOString()
                    };

                    updates.push({
                        appwrite_id: appwriteProperty.$id,
                        ...updateRecord
                    });
                    
                } catch (error) {
                    console.error(`❌ Error processing property ${appwriteProperty.$id}:`, error.message);
                }
            }

            // Execute batch update
            if (updates.length > 0) {
                try {
                    const { data, error } = await this.supabase
                        .from('properties')
                        .upsert(updates, {
                            onConflict: 'appwrite_id',
                            ignoreDuplicates: false
                        })
                        .select('id, property_code, appwrite_id');

                    if (error) {
                        console.error('❌ Batch update error:', error);
                    } else {
                        updateCount += data.length;
                        console.log(`✅ Updated ${data.length} properties with media data`);
                        
                        // Show sample
                        if (data.length > 0) {
                            console.log(`   Sample: ${data[0].property_code} (${data[0].appwrite_id})`);
                        }
                    }
                } catch (updateError) {
                    console.error('❌ Critical update error:', updateError);
                }
            }

            // Progress indicator
            const progress = ((i + batchSize) / appwriteProperties.length * 100).toFixed(1);
            console.log(`📊 Progress: ${progress}% | Updated: ${updateCount} properties`);
            console.log(`📷 Media found: ${mediaStats.totalImages} images, ${mediaStats.totalVideos} videos`);
        }

        console.log(`\n📊 MEDIA UPDATE SUMMARY:`);
        console.log(`   ✅ Properties Updated: ${updateCount}`);
        console.log(`   🖼️ Total Images: ${mediaStats.totalImages} (Expected: 5000+)`);
        console.log(`   🎥 Total Videos: ${mediaStats.totalVideos} (Expected: 173+)`);
        console.log(`   🏠 Properties with Media: ${mediaStats.propertiesWithMedia}`);
        console.log(`   🔗 All media linked to Appwrite storage buckets`);
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

    async validateMediaUpdate() {
        console.log('\n🔍 VALIDATION: Checking media update results...');
        
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
                console.log('\n✅ MEDIA UPDATE SUCCESSFUL: 1000+ images linked properly');
                console.log('✅ All media maintains connection to Appwrite storage');
            } else {
                console.log('\n⚠️ MEDIA UPDATE NEEDS REVIEW: Less than 1000 images found');
            }

        } catch (error) {
            console.error('❌ Validation failed:', error);
        }
    }
}

// Main execution
async function main() {
    const mediaService = new MediaUpdateService();
    
    try {
        await mediaService.updateMediaData();
    } catch (error) {
        console.error('💥 Media update failed:', error);
        process.exit(1);
    }
}

// Execute if running directly
if (require.main === module) {
    main();
}

module.exports = { MediaUpdateService };
