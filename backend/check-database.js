// Simple script to check database structure
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const config = {
    supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_SERVICE_ROLE_KEY
    }
};

async function checkDatabaseStructure() {
    console.log('🔍 CHECKING DATABASE STRUCTURE...');
    
    const supabase = createClient(config.supabase.url, config.supabase.key);
    
    try {
        // Check if property_images table exists
        console.log('\n📋 Checking property_images table...');
        const { data: images, error: imageError } = await supabase
            .from('property_images')
            .select('*')
            .limit(1);

        if (imageError) {
            console.log('❌ property_images table error:', imageError.message);
            if (imageError.code === '42P01') {
                console.log('💡 property_images table does not exist');
            }
        } else {
            console.log('✅ property_images table exists');
            if (images && images.length > 0) {
                console.log('📋 Columns:', Object.keys(images[0]).join(', '));
            } else {
                console.log('📋 Table is empty');
            }
        }

        // Check properties table with appwrite_id
        console.log('\n📋 Checking properties table...');
        const { data: properties, error: propError } = await supabase
            .from('properties')
            .select('id, appwrite_id, property_code, title')
            .limit(3);

        if (propError) {
            console.log('❌ properties table error:', propError.message);
        } else {
            console.log('✅ properties table exists');
            console.log(`📊 Found ${properties.length} properties`);
            if (properties.length > 0) {
                console.log('📋 Sample columns:', Object.keys(properties[0]).join(', '));
                console.log('🏠 Sample property:', {
                    id: properties[0].id,
                    appwrite_id: properties[0].appwrite_id,
                    property_code: properties[0].property_code
                });
            }
        }

        // Check if images are stored in properties table directly
        console.log('\n🔍 Checking for images in properties table...');
        const { data: propsWithImages, error: imgError } = await supabase
            .from('properties')
            .select('appwrite_id, property_code')
            .not('appwrite_id', 'is', null)
            .limit(5);

        if (!imgError && propsWithImages) {
            console.log(`📊 Found ${propsWithImages.length} properties with appwrite_id`);
            console.log('💡 These properties can be linked to Appwrite storage');
            
            propsWithImages.forEach((prop, index) => {
                console.log(`   ${index + 1}. ${prop.property_code} → ${prop.appwrite_id}`);
            });
        }

    } catch (error) {
        console.error('❌ Database check failed:', error);
    }
}

if (require.main === module) {
    checkDatabaseStructure();
}

module.exports = { checkDatabaseStructure };
