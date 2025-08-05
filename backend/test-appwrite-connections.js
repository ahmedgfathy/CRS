// Test script to verify Appwrite storage connections
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const config = {
    supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_SERVICE_ROLE_KEY
    }
};

async function testAppwriteStorageConnections() {
    console.log('🔍 TESTING APPWRITE STORAGE CONNECTIONS...');
    
    const supabase = createClient(config.supabase.url, config.supabase.key);
    
    try {
        // First, let's check what columns exist in property_images table
        console.log('🔍 Checking property_images table structure...');
        const { data: tableInfo, error: tableError } = await supabase
            .from('property_images')
            .select('*')
            .limit(1);

        if (tableError) {
            console.log('❌ property_images table error:', tableError.message);
            console.log('💡 This might mean the media migration hasn\'t been run yet');
            return;
        }

        if (tableInfo && tableInfo.length > 0) {
            console.log('📋 Available columns in property_images:');
            console.log('   ', Object.keys(tableInfo[0]).join(', '));
        }

        // Get properties with their Appwrite IDs and basic images (using available columns)
        const { data: propertiesWithImages, error } = await supabase
            .from('properties')
            .select(`
                id,
                appwrite_id,
                property_code,
                title,
                property_images(
                    property_id,
                    image_url,
                    image_title,
                    is_primary
                )
            `)
            .not('property_images', 'is', null)
            .limit(5);

        if (error) {
            console.error('❌ Error fetching properties:', error);
            return;
        }

        if (!propertiesWithImages || propertiesWithImages.length === 0) {
            console.log('⚠️ No properties with images found');
            console.log('💡 This means the media migration hasn\'t been run yet');
            return;
        }

        console.log(`\n📊 Found ${propertiesWithImages.length} properties with images:`);
        
        let totalImages = 0;
        let validConnections = 0;
        
        propertiesWithImages.forEach((property, index) => {
            console.log(`\n🏠 Property ${index + 1}: ${property.property_code}`);
            console.log(`   Title: ${property.title?.substring(0, 50)}...`);
            console.log(`   Appwrite ID: ${property.appwrite_id}`);
            console.log(`   Supabase ID: ${property.id}`);
            
            if (property.property_images && property.property_images.length > 0) {
                console.log(`   📷 Images (${property.property_images.length}):`);
                
                property.property_images.forEach((image, imgIndex) => {
                    totalImages++;
                    
                    console.log(`      ${imgIndex + 1}. ${image.is_primary ? '[PRIMARY]' : ''}`);
                    console.log(`         Property ID: ${image.property_id}`);
                    console.log(`         Image Title: ${image.image_title}`);
                    console.log(`         Image URL: ${image.image_url?.substring(0, 60)}...`);
                    
                    // Check if this looks like an Appwrite URL
                    if (image.image_url && image.image_url.includes('appwrite')) {
                        validConnections++;
                        console.log(`         ✅ Appwrite storage detected`);
                    } else {
                        console.log(`         ⚠️ Not Appwrite storage or missing URL`);
                    }
                });
            } else {
                console.log(`   📷 No images found`);
            }
        });
        
        console.log(`\n📈 STORAGE SUMMARY:`);
        console.log(`   Total Images: ${totalImages}`);
        console.log(`   Appwrite Storage URLs: ${validConnections}`);
        console.log(`   Appwrite Usage: ${totalImages > 0 ? ((validConnections / totalImages) * 100).toFixed(1) : 0}%`);
        
        if (validConnections === totalImages && totalImages > 0) {
            console.log(`   ✅ All images are using Appwrite storage!`);
            console.log(`   🔗 Perfect! Images are properly linked to Appwrite`);
        } else if (validConnections > 0) {
            console.log(`   ⚠️ Mixed storage sources detected`);
            console.log(`   💡 Some images use Appwrite, others may use different storage`);
        } else {
            console.log(`   ❌ No Appwrite storage URLs found`);
            console.log(`   💡 Images may be stored elsewhere or migration needs to run`);
        }
        
        // Test one image URL accessibility
        if (totalImages > 0) {
            const sampleImage = propertiesWithImages[0].property_images[0];
            console.log(`\n🌐 Testing image URL accessibility:`);
            console.log(`   URL: ${sampleImage.image_url}`);
            console.log(`   💡 You can test this URL in a browser to verify Appwrite storage access`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

if (require.main === module) {
    testAppwriteStorageConnections();
}

module.exports = { testAppwriteStorageConnections };
