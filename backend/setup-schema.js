// setup-schema.js - Create database schema for migration
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createSchema() {
    console.log('🏗️ Creating database schema for migration...');
    
    try {
        // Create areas table
        console.log('📍 Creating areas table...');
        const { error: areasError } = await supabase.rpc('sql', {
            query: `
                CREATE TABLE IF NOT EXISTS areas (
                    id BIGSERIAL PRIMARY KEY,
                    area_name VARCHAR(100) NOT NULL UNIQUE,
                    area_name_ar VARCHAR(100),
                    region_id BIGINT,
                    description TEXT,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                CREATE INDEX IF NOT EXISTS idx_areas_name ON areas(area_name);
                CREATE INDEX IF NOT EXISTS idx_areas_active ON areas(is_active);
            `
        });
        
        if (areasError) {
            console.error('❌ Error creating areas table:', areasError);
            throw areasError;
        }
        console.log('✅ Areas table created');

        // Create property types table
        console.log('🏘️ Creating property_types table...');
        const { error: typesError } = await supabase.rpc('sql', {
            query: `
                CREATE TABLE IF NOT EXISTS property_types (
                    id BIGSERIAL PRIMARY KEY,
                    type_name VARCHAR(50) NOT NULL UNIQUE,
                    type_name_ar VARCHAR(50),
                    category VARCHAR(50),
                    description TEXT,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                INSERT INTO property_types (type_name, category) VALUES
                    ('apartment', 'residential'),
                    ('villa', 'residential'),
                    ('townhouse', 'residential'),
                    ('town house', 'residential'),
                    ('studio', 'residential'),
                    ('penthouse', 'residential'),
                    ('duplex', 'residential'),
                    ('office', 'commercial'),
                    ('shop', 'commercial'),
                    ('warehouse', 'commercial')
                ON CONFLICT (type_name) DO NOTHING;
            `
        });
        
        if (typesError) {
            console.error('❌ Error creating property_types table:', typesError);
            throw typesError;
        }
        console.log('✅ Property types table created');

        // Create property categories table
        console.log('📂 Creating property_categories table...');
        const { error: categoriesError } = await supabase.rpc('sql', {
            query: `
                CREATE TABLE IF NOT EXISTS property_categories (
                    id BIGSERIAL PRIMARY KEY,
                    category_name VARCHAR(50) NOT NULL UNIQUE,
                    category_name_ar VARCHAR(50),
                    description TEXT,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                INSERT INTO property_categories (category_name) VALUES
                    ('Residential'),
                    ('Commercial'),
                    ('Administrative'),
                    ('Mixed Use')
                ON CONFLICT (category_name) DO NOTHING;
            `
        });
        
        if (categoriesError) {
            console.error('❌ Error creating property_categories table:', categoriesError);
            throw categoriesError;
        }
        console.log('✅ Property categories table created');

        // Create contacts table
        console.log('👥 Creating contacts table...');
        const { error: contactsError } = await supabase.rpc('sql', {
            query: `
                CREATE TABLE IF NOT EXISTS contacts (
                    id BIGSERIAL PRIMARY KEY,
                    contact_name VARCHAR(100),
                    primary_phone VARCHAR(20),
                    secondary_phone VARCHAR(20),
                    email VARCHAR(100),
                    contact_type VARCHAR(50),
                    notes TEXT,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(primary_phone);
                CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);
            `
        });
        
        if (contactsError) {
            console.error('❌ Error creating contacts table:', contactsError);
            throw contactsError;
        }
        console.log('✅ Contacts table created');

        // Create properties table
        console.log('🏠 Creating properties table...');
        const { error: propertiesError } = await supabase.rpc('sql', {
            query: `
                CREATE TABLE IF NOT EXISTS properties (
                    id BIGSERIAL PRIMARY KEY,
                    appwrite_id VARCHAR(50) UNIQUE NOT NULL,
                    property_code VARCHAR(50) UNIQUE NOT NULL,
                    
                    title VARCHAR(200),
                    description TEXT,
                    
                    property_type_id BIGINT REFERENCES property_types(id),
                    category_id BIGINT REFERENCES property_categories(id),
                    area_id BIGINT REFERENCES areas(id),
                    
                    listing_type VARCHAR(10) CHECK (listing_type IN ('Rent', 'Sale')),
                    bedrooms INT CHECK (bedrooms >= 0 AND bedrooms <= 20),
                    floor_number VARCHAR(20),
                    
                    land_area DECIMAL(8,2) CHECK (land_area >= 0),
                    building_area DECIMAL(8,2) CHECK (building_area >= 0),
                    space_earth DECIMAL(8,2),
                    space_unit DECIMAL(8,2),
                    space_guard DECIMAL(8,2),
                    
                    price DECIMAL(15,2) CHECK (price >= 0 AND price <= 99999999),
                    currency VARCHAR(3) DEFAULT 'EGP',
                    down_payment DECIMAL(15,2),
                    price_per_meter DECIMAL(10,2),
                    monthly_payment DECIMAL(10,2),
                    installment_plan JSON,
                    
                    primary_contact_id BIGINT REFERENCES contacts(id),
                    handler_contact_id BIGINT REFERENCES contacts(id),
                    
                    listing_status VARCHAR(20),
                    activity_type VARCHAR(50),
                    offered_by VARCHAR(20),
                    inside_compound BOOLEAN,
                    phase_name VARCHAR(50),
                    compound_name VARCHAR(150),
                    
                    is_liked BOOLEAN DEFAULT false,
                    featured_home BOOLEAN DEFAULT false,
                    
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                CREATE INDEX IF NOT EXISTS idx_properties_code ON properties(property_code);
                CREATE INDEX IF NOT EXISTS idx_properties_area ON properties(area_id);
                CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type_id);
                CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
                CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON properties(listing_type);
                CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(listing_status);
            `
        });
        
        if (propertiesError) {
            console.error('❌ Error creating properties table:', propertiesError);
            throw propertiesError;
        }
        console.log('✅ Properties table created');

        // Create property images table
        console.log('🖼️ Creating property_images table...');
        const { error: imagesError } = await supabase.rpc('sql', {
            query: `
                CREATE TABLE IF NOT EXISTS property_images (
                    id BIGSERIAL PRIMARY KEY,
                    property_id BIGINT REFERENCES properties(id) ON DELETE CASCADE,
                    appwrite_file_id VARCHAR(50),
                    image_url TEXT NOT NULL,
                    image_title VARCHAR(200),
                    sort_order INT DEFAULT 0,
                    is_primary BOOLEAN DEFAULT false,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                CREATE INDEX IF NOT EXISTS idx_property_images_property ON property_images(property_id);
                CREATE INDEX IF NOT EXISTS idx_property_images_primary ON property_images(is_primary);
            `
        });
        
        if (imagesError) {
            console.error('❌ Error creating property_images table:', imagesError);
            throw imagesError;
        }
        console.log('✅ Property images table created');

        // Create property videos table
        console.log('🎥 Creating property_videos table...');
        const { error: videosError } = await supabase.rpc('sql', {
            query: `
                CREATE TABLE IF NOT EXISTS property_videos (
                    id BIGSERIAL PRIMARY KEY,
                    property_id BIGINT REFERENCES properties(id) ON DELETE CASCADE,
                    video_url TEXT NOT NULL,
                    video_title VARCHAR(200),
                    video_type VARCHAR(50),
                    sort_order INT DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                CREATE INDEX IF NOT EXISTS idx_property_videos_property ON property_videos(property_id);
            `
        });
        
        if (videosError) {
            console.error('❌ Error creating property_videos table:', videosError);
            throw videosError;
        }
        console.log('✅ Property videos table created');

        console.log('🎉 Database schema created successfully!');
        console.log('📊 Tables created:');
        console.log('   ✅ areas');
        console.log('   ✅ property_types');
        console.log('   ✅ property_categories');  
        console.log('   ✅ contacts');
        console.log('   ✅ properties');
        console.log('   ✅ property_images');
        console.log('   ✅ property_videos');
        console.log('');
        console.log('🚀 Ready for migration!');

    } catch (error) {
        console.error('❌ Schema creation failed:', error);
        process.exit(1);
    }
}

createSchema();
